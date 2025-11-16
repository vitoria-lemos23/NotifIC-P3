#!/usr/bin/env bash
set -euo pipefail

# run_worker.sh
# Helper to run the RQ worker with environment variables loaded from
# `src/backend/.env.worker` (if present). Intended for local testing only.

# Change to repository backend dir (script is located in src/backend/scripts)
cd "$(dirname "$0")/.."

ENV_FILE=".env.worker"
if [ -f "$ENV_FILE" ]; then
  echo "Sourcing $ENV_FILE"
  # export all vars from the file
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

echo "Checking required environment variables..."
missing=0
for v in REDIS_URL MAIL_USERNAME MAIL_PASSWORD; do
  if [ -z "${!v:-}" ]; then
    echo "  - $v is not set"
    missing=1
  else
    echo "  - $v is set"
  fi
done

if [ "$missing" -ne 0 ]; then
  echo "One or more required environment variables are missing."
  echo "Create '$ENV_FILE' with the values or export them in your shell, then re-run this script." 
  echo "Example .env.worker contents (DO NOT COMMIT):"
  echo "REDIS_URL='rediss://default:<token>@...:6379'"
  echo "MAIL_USERNAME='your@gmail.com'"
  echo "MAIL_PASSWORD='your-app-password'"
  exit 1
fi

echo "Starting rq worker with REDIS_URL=${REDIS_URL:0:40}..."
python rq_worker.py
