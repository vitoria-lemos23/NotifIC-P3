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

# Ensure backend dir is on PYTHONPATH so 'flask --app wsgi' can import wsgi module
export PYTHONPATH="$BACKEND_DIR:${PYTHONPATH:-}"

echo "[start.sh] Changing to backend directory"
cd "$BACKEND_DIR" || { echo "[start.sh] ERROR: failed to cd $BACKEND_DIR"; exit 1; }

echo "[start.sh] Attempting database migrations (this may fail if DATABASE_URL not set)"
if python -m flask --app wsgi db upgrade; then
  echo "[start.sh] Migrations applied successfully"
else
  echo "[start.sh] Migrations failed or are not configured — continuing startup"
fi

echo "[start.sh] Starting Gunicorn (wsgi:app fallback to app:create_app())"
# Use the same Python interpreter (from the venv) to run gunicorn so imports resolve properly
exec python -m gunicorn wsgi:app --bind 0.0.0.0:$PORT || exec python -m gunicorn "app:create_app()" --bind 0.0.0.0:$PORT
