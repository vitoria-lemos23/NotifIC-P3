#!/usr/bin/env bash
set -euo pipefail

echo "[start.sh] Running render build script"
bash render-build.sh

# Determine absolute path to repository and try to locate wsgi.py robustly.
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Try to find wsgi.py under the repo (limit depth to avoid long searches).
# This is robust against Render's different working directories and duplicated paths.
found_ws="$(find "$REPO_DIR" -maxdepth 6 -type f -name wsgi.py -print -quit 2>/dev/null || true)"
if [ -n "$found_ws" ]; then
  BACKEND_DIR="$(dirname "$found_ws")"
else
  # fall back to the common location
  if [ -d "$REPO_DIR/src/backend" ]; then
    BACKEND_DIR="$REPO_DIR/src/backend"
  else
    BACKEND_DIR="$(realpath "$REPO_DIR/../src/backend" 2>/dev/null || true)"
  fi
fi

if [ -z "$BACKEND_DIR" ] || [ ! -d "$BACKEND_DIR" ]; then
  echo "[start.sh] ERROR: backend directory not found. Searched for wsgi.py and common paths." >&2
  exit 1
fi

echo "[start.sh] Backend dir resolved to: $BACKEND_DIR"

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
print('[migrate] sys.path before insert:', sys.path[:3])
sys.path.insert(0, os.getcwd())
print('[migrate] sys.path after insert:', sys.path[:3])
try:
    import importlib
    wsgi = importlib.import_module('wsgi')
    app = getattr(wsgi, 'app', None)
    if app is None:
        print('[migrate] wsgi module has no attribute app')
    else:
        print('[migrate] imported wsgi, running flask_migrate.upgrade()')
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
# Use the same Python interpreter (from the venv) to run gunicorn so imports resolve properly
# Try local module `wsgi:app` first because we `cd` into the backend directory above.
exec python -m gunicorn wsgi:app --bind 0.0.0.0:$PORT || \
  exec python -m gunicorn "src.backend.wsgi:app" --bind 0.0.0.0:$PORT || \
  exec python -m gunicorn "app:create_app()" --bind 0.0.0.0:$PORT
