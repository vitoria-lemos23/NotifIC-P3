#!/usr/bin/env bash
set -euo pipefail

echo "[start.sh] Running render build script"
bash render-build.sh

# Determine absolute path to backend directory (handle different CWDs on Render)
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${REPO_DIR}/src/backend"
if [ ! -d "$BACKEND_DIR" ]; then
  # try one level up (in case script is executed from a nested src folder)
  BACKEND_DIR="$(realpath "$REPO_DIR/../src/backend" 2>/dev/null || true)"
fi

if [ -z "$BACKEND_DIR" ] || [ ! -d "$BACKEND_DIR" ]; then
  echo "[start.sh] ERROR: backend directory not found (tried $REPO_DIR/src/backend and parent)." >&2
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
