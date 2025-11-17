#!/usr/bin/env bash
set -euo pipefail

echo "[start.sh] Running render build script"
bash render-build.sh

echo "[start.sh] Changing to backend directory"
cd src/backend || { echo "[start.sh] ERROR: src/backend not found"; exit 1; }

echo "[start.sh] Attempting database migrations (this may fail if DATABASE_URL not set)"
if python -m flask --app wsgi db upgrade; then
  echo "[start.sh] Migrations applied successfully"
else
  echo "[start.sh] Migrations failed or are not configured — continuing startup"
fi

echo "[start.sh] Starting Gunicorn (wsgi:app fallback to app:create_app())"
exec gunicorn wsgi:app --bind 0.0.0.0:$PORT || exec gunicorn "app:create_app()" --bind 0.0.0.0:$PORT
