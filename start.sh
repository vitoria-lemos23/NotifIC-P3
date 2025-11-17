#!/usr/bin/env bash
set -euo pipefail

echo "[start.sh] Running render build script"
bash render-build.sh

# Absolute path to repository root (script location)
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[start.sh] Repo dir: $REPO_DIR"

# Build a list of candidate backend directories (prefer common locations)
declare -a candidates
candidates+=("$REPO_DIR/src/backend" "$REPO_DIR/backend" "$REPO_DIR/src" "$REPO_DIR")

# Append directories that contain a wsgi.py under the repo (depth limited)
while IFS= read -r p; do
  candidates+=("$p")
done < <(find "$REPO_DIR" -maxdepth 6 -type f -name wsgi.py -printf '%h\n' 2>/dev/null || true)

# Normalize, dedupe and inspect candidates, picking the best one.
declare -A seen
BACKEND_DIR=""
best_candidate=""
best_entries=-1
echo "[start.sh] Candidate directories (raw):"
for c in "${candidates[@]}"; do
  if [ -z "$c" ]; then continue; fi
  if [ -d "$c" ]; then
    # normalize path
    if command -v realpath >/dev/null 2>&1; then
      c_norm="$(realpath "$c")"
    else
      c_norm="$c"
    fi
    if [ -n "${seen[$c_norm]:-}" ]; then
      continue
    fi
    seen[$c_norm]=1
    echo " - $c_norm"
    # prefer directories that clearly look like the backend
    # skip empty dirs
    entries_count=$(ls -A "$c_norm" 2>/dev/null | wc -l || true)
    echo "   entries: $entries_count"
    echo "   contains: wsgi=$( [ -f \"$c_norm/wsgi.py\" ] && echo yes || echo no ), app=$( [ -d \"$c_norm/app\" ] && echo yes || echo no ), migrations=$( [ -d \"$c_norm/migrations\" ] && echo yes || echo no ), requirements=$( [ -f \"$c_norm/requirements.txt\" ] && echo yes || echo no )"

    if [ "$entries_count" -eq 0 ]; then
      echo "   skipping empty directory"
      continue
    fi

    if [ -f "$c_norm/wsgi.py" ] && ( [ -d "$c_norm/app" ] || [ -d "$c_norm/migrations" ] || [ -f "$c_norm/requirements.txt" ] ); then
      BACKEND_DIR="$c_norm"
      echo "[start.sh] Selected backend dir (strong match): $BACKEND_DIR"
      break
    fi

    # prefer any dir with app/ or migrations/ next
    if [ -z "$BACKEND_DIR" ] && ( [ -d "$c_norm/app" ] || [ -d "$c_norm/migrations" ] ); then
      BACKEND_DIR="$c_norm"
      echo "[start.sh] Selected backend dir (app/migrations): $BACKEND_DIR"
      break
    fi

    # fallback: if it contains wsgi.py alone, accept it
    if [ -z "$BACKEND_DIR" ] && [ -f "$c_norm/wsgi.py" ]; then
      BACKEND_DIR="$c_norm"
      echo "[start.sh] Selected backend dir (wsgi found): $BACKEND_DIR"
      break
    fi
    # track best candidate by number of entries (avoid empty nested dirs)
    if [ "$entries_count" -gt "$best_entries" ]; then
      best_entries="$entries_count"
      best_candidate="$c_norm"
    fi
  fi
done

# Final fallback: choose best non-empty candidate if we didn't already pick one
if [ -z "$BACKEND_DIR" ]; then
  if [ -n "$best_candidate" ]; then
    BACKEND_DIR="$best_candidate"
    echo "[start.sh] Selected backend dir (best_candidate by size): $BACKEND_DIR"
  else
    if [ -d "$REPO_DIR/src/backend" ]; then
      BACKEND_DIR="$REPO_DIR/src/backend"
    elif [ -d "$REPO_DIR/backend" ]; then
      BACKEND_DIR="$REPO_DIR/backend"
    else
      echo "[start.sh] ERROR: backend directory not found after scanning candidates." >&2
      exit 1
    fi
    echo "[start.sh] Selected backend dir (fallback): $BACKEND_DIR"
  fi
fi

echo "[start.sh] Backend dir resolved to: $BACKEND_DIR"

# If the selected backend dir doesn't contain expected markers, try climbing up
# (this handles Render creating nested duplicate paths like src/src/backend/src/backend)
climb_limit=6
climbed=0
curr="$BACKEND_DIR"
while [ $climbed -lt $climb_limit ]; do
  if [ -f "$curr/wsgi.py" ] || [ -d "$curr/app" ] || [ -d "$curr/migrations" ] || [ -f "$curr/requirements.txt" ]; then
    # good candidate
    BACKEND_DIR="$curr"
    break
  fi
  parent="$(dirname "$curr")"
  if [ "$parent" = "$curr" ] || [ -z "$parent" ]; then
    break
  fi
  # stop if we would climb above repo root
  if [ "$(realpath "$parent")" = "$(realpath "$REPO_DIR")" ] || [ "$(realpath "$parent")" = "$(realpath "$REPO_DIR/..")" ]; then
    # still check parent once
    if [ -f "$parent/wsgi.py" ] || [ -d "$parent/app" ] || [ -d "$parent/migrations" ] || [ -f "$parent/requirements.txt" ]; then
      BACKEND_DIR="$parent"
    fi
    break
  fi
  curr="$parent"
  climbed=$((climbed+1))
done

echo "[start.sh] Backend dir after climb-check: $BACKEND_DIR"

# Ensure backend dir AND repo root are on PYTHONPATH so imports resolve for gunicorn/flask
export PYTHONPATH="$BACKEND_DIR:$REPO_DIR:${PYTHONPATH:-}"

echo "[start.sh] Changing to backend directory"
cd "$BACKEND_DIR" || { echo "[start.sh] ERROR: failed to cd $BACKEND_DIR"; exit 1; }

echo "[start.sh] Attempting database migrations (this may fail if DATABASE_URL not set)"
echo "[start.sh] Debug: current dir: $(pwd)"
echo "[start.sh] Debug: listing backend dir contents:" && ls -la || true

# Run migrations programmatically (avoid relying on Flask CLI which may fail to import)
python - <<'PY'
import sys, os, traceback
print('[migrate] sys.path before insert:', sys.path[:5])
sys.path.insert(0, os.getcwd())
print('[migrate] sys.path after insert:', sys.path[:5])
try:
    import importlib
    tried = []
    app = None
    # try local wsgi first, then fully-qualified src.backend.wsgi
    for mod in ('wsgi','src.backend.wsgi','app.wsgi'):
        try:
            tried.append(mod)
            wsgi = importlib.import_module(mod)
            app = getattr(wsgi, 'app', None)
            if app is not None:
                print('[migrate] imported', mod)
                break
        except Exception as e:
            print('[migrate] import', mod, 'failed:', type(e).__name__)
    if app is None:
        print('[migrate] None of tried modules produced an app. tried:', tried)
    else:
        from flask_migrate import upgrade
        with app.app_context():
            upgrade()
        print('[migrate] upgrade() completed')
except Exception:
    print('[migrate] Exception while importing wsgi or running migrations:')
    traceback.print_exc()
PY

echo "[start.sh] Migrations step finished (check above for errors)"

echo "[start.sh] Starting Gunicorn (try local wsgi first to match backend cwd)"

# Detect Windows locally and avoid running Gunicorn (which requires fcntl on Unix)
IS_WINDOWS=$(python - <<'PY'
import platform
print('1' if platform.system().lower().startswith('win') else '0')
PY
)
if [ "$IS_WINDOWS" = "1" ]; then
  echo "[start.sh] Detected Windows environment. Gunicorn requires 'fcntl' which is not available on Windows."
  echo "[start.sh] For local testing on Windows, install Waitress and run:"
  echo "  pip install waitress"
  echo "  waitress-serve --port=$PORT wsgi:app"
  echo "[start.sh] Alternatively run this script inside WSL or deploy to Render (Linux)."
  echo "[start.sh] Attempting to continue with Gunicorn (this will likely fail on Windows)..."
fi

exec python -m gunicorn wsgi:app --bind 0.0.0.0:$PORT || \
  exec python -m gunicorn "src.backend.wsgi:app" --bind 0.0.0.0:$PORT || \
  exec python -m gunicorn "app:create_app()" --bind 0.0.0.0:$PORT
