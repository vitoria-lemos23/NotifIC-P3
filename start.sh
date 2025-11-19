#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "start.sh: repo root is $REPO_DIR"

# Ensure python packages installed by build are importable
export PYTHONPATH="$REPO_DIR:$REPO_DIR/src:$PYTHONPATH"

# Prefer backend directory if present
BACKEND_DIR="$REPO_DIR/src/backend"
if [ -d "$BACKEND_DIR" ]; then
  echo "start.sh: found backend dir $BACKEND_DIR"
  cd "$BACKEND_DIR"
else
  echo "start.sh: backend dir not found, staying in repo root"
  cd "$REPO_DIR"
fi

# Run DB migrations if Flask app importable
echo "start.sh: attempting to run migrations (if available)"
set +e
# try multiple flask app import names
python -m flask --app wsgi db upgrade 2>/tmp/migrate.err || \
python -m flask --app src.backend.wsgi db upgrade 2>/tmp/migrate.err || \
python -m flask --app app db upgrade 2>/tmp/migrate.err
MIGRATE_EXIT=$?
set -e
if [ $MIGRATE_EXIT -eq 0 ]; then
  echo "[migrate] DB migrations applied successfully"
else
  echo "[migrate] no migrations applied (exit code $MIGRATE_EXIT). See /tmp/migrate.err for details"
  if [ -s /tmp/migrate.err ]; then
    echo "--- migrate stderr ---"
    cat /tmp/migrate.err
    echo "--- end migrate stderr ---"
  fi
fi

# Start the app with Gunicorn. Render provides $PORT.
: ${PORT:=8000}
: ${WEB_CONCURRENCY:=4}
echo "start.sh: starting Gunicorn on 0.0.0.0:$PORT (workers=$WEB_CONCURRENCY)"
exec python -m gunicorn "wsgi:app" -b 0.0.0.0:$PORT -w $WEB_CONCURRENCY --log-level=info
