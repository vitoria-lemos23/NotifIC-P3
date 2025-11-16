#!/usr/bin/env bash
set -euo pipefail

# migrate_to_render.sh
# Helper script to export a local Postgres DB and restore it into a Render Managed Postgres.
# Supports Windows (Git Bash) where psql/pg_dump may be in Program Files, and falls back to Docker.
# Usage: run from repository root or from `src/backend`.

REPO_ROOT="$(cd "$(dirname "$0")"/.. >/dev/null 2>&1 && pwd)"
DEFAULT_DUMP_FILE="$REPO_ROOT/notific.dump"

find_executable() {
  local name=$1
  # check PATH first
  if command -v "$name" >/dev/null 2>&1; then
    command -v "$name"
    return 0
  fi

  # common Windows Program Files locations (Git Bash path style)
  candidates=(
    "/c/Program Files/PostgreSQL/18/bin/$name.exe"
    "/c/Program Files/PostgreSQL/16/bin/$name.exe"
    "/c/Program Files/PostgreSQL/15/bin/$name.exe"
    "/c/Program Files/PostgreSQL/14/bin/$name.exe"
    "/c/Program Files/PostgreSQL/13/bin/$name.exe"
  )
  for c in "${candidates[@]}"; do
    if [ -x "$c" ]; then
      echo "$c"
      return 0
    fi
  done

  return 1
}

use_docker=false
PG_DUMP_BIN=""
PG_RESTORE_BIN=""
PSQL_BIN=""

if PG_DUMP_BIN=$(find_executable pg_dump) && PG_RESTORE_BIN=$(find_executable pg_restore) && PSQL_BIN=$(find_executable psql); then
  echo "Found local pg tools:"
  echo "  pg_dump: $PG_DUMP_BIN"
  echo "  pg_restore: $PG_RESTORE_BIN"
  echo "  psql: $PSQL_BIN"
else
  if command -v docker >/dev/null 2>&1; then
    echo "Local pg tools not found, will use Docker postgres image for operations."
    use_docker=true
  else
    echo "Error: pg_dump/pg_restore/psql not found and Docker not available. Install PostgreSQL client or Docker." >&2
    exit 1
  fi
fi

prompt_read_secret() {
  # prompt hidden input (works in Git Bash)
  local varname=$1
  local prompt=$2
  echo -n "$prompt: "
  read -s value
  echo
  printf -v "$varname" "%s" "$value"
}

echo "\n--- Migrate local DB -> Render Managed Postgres ---"

# Get RENDER_DATABASE_URL from env or ask
if [ -z "${RENDER_DATABASE_URL:-}" ]; then
  echo "RENDER_DATABASE_URL not set. Please paste the Render External connection string (e.g. postgres://user:pass@host:5432/dbname?sslmode=require)"
  read -r RENDER_DATABASE_URL
fi

echo "Using Render target: ${RENDER_DATABASE_URL}"

# Local DB connection details
echo "\nEnter local database connection details (press Enter to accept defaults)"
read -r -p "Local host [localhost]: " LOCAL_DB_HOST
LOCAL_DB_HOST=${LOCAL_DB_HOST:-localhost}
read -r -p "Local port [5432]: " LOCAL_DB_PORT
LOCAL_DB_PORT=${LOCAL_DB_PORT:-5432}
read -r -p "Local user [postgres]: " LOCAL_DB_USER
LOCAL_DB_USER=${LOCAL_DB_USER:-postgres}
read -r -p "Local database name [NotificDB]: " LOCAL_DB_NAME
LOCAL_DB_NAME=${LOCAL_DB_NAME:-NotificDB}

prompt_read_secret LOCAL_DB_PASSWORD "Local DB password (will be hidden)"

echo "\nLocal: ${LOCAL_DB_USER}@${LOCAL_DB_HOST}:${LOCAL_DB_PORT}/${LOCAL_DB_NAME}"

echo "\nTHIS WILL RESTORE DATA INTO THE RENDER DATABASE TARGET. This may overwrite objects in the target database."
read -r -p "Type YES to proceed: " confirm
if [ "$confirm" != "YES" ]; then
  echo "Aborting. No changes were made."
  exit 0
fi

dump_file="${DEFAULT_DUMP_FILE}"
echo "\nDump file will be: $dump_file"

if [ -f "$dump_file" ]; then
  read -r -p "$dump_file already exists. Overwrite? [y/N]: " ov
  ov=${ov:-N}
  if [[ "$ov" =~ ^[Yy]$ ]]; then
    rm -f "$dump_file"
  else
    echo "Using existing dump file."
  fi
fi

echo "\nCreating dump from local DB..."
if [ "$use_docker" = false ]; then
  # export password for the pg tools only in this shell
  export PGPASSWORD="$LOCAL_DB_PASSWORD"
  "$PG_DUMP_BIN" -Fc -h "$LOCAL_DB_HOST" -p "$LOCAL_DB_PORT" -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" -f "$dump_file"
  unset PGPASSWORD
else
  # Docker: mount the repo root so dump appears in PWD
  docker run --rm -e PGPASSWORD="$LOCAL_DB_PASSWORD" -v "$REPO_ROOT":/work -w /work postgres:15 \
    pg_dump -Fc -h "$LOCAL_DB_HOST" -p "$LOCAL_DB_PORT" -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" -f "/work/$(basename "$dump_file")"
fi

echo "Dump created: $dump_file"

echo "\nRestoring dump to Render target..."
if [ "$use_docker" = false ]; then
  "$PG_RESTORE_BIN" --verbose --clean --no-owner --no-acl -d "$RENDER_DATABASE_URL" "$dump_file"
else
  docker run --rm -e RENDER_DATABASE_URL="$RENDER_DATABASE_URL" -v "$REPO_ROOT":/work -w /work postgres:15 \
    bash -c "pg_restore --verbose --clean --no-owner --no-acl -d \"\$RENDER_DATABASE_URL\" /work/$(basename "$dump_file")"
fi

echo "\nRestoration finished. Running a couple of post-steps (sequences, extensions)..."

# create uuid-ossp if needed and set sequence for news
if [ "$use_docker" = false ]; then
  "$PSQL_BIN" "$RENDER_DATABASE_URL" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' || true
  "$PSQL_BIN" "$RENDER_DATABASE_URL" -c "SELECT setval(pg_get_serial_sequence('news','id'), COALESCE((SELECT MAX(id) FROM news),1));" || true
else
  docker run --rm -e RENDER_DATABASE_URL="$RENDER_DATABASE_URL" postgres:15 \
    psql "$RENDER_DATABASE_URL" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' || true
  docker run --rm -e RENDER_DATABASE_URL="$RENDER_DATABASE_URL" postgres:15 \
    psql "$RENDER_DATABASE_URL" -c "SELECT setval(pg_get_serial_sequence('news','id'), COALESCE((SELECT MAX(id) FROM news),1));" || true
fi

echo "\nDone. Verify the Render DB and update your Render Web Service `DATABASE_URL` secret if necessary."
echo "Tip: to test, run: \n  \"$PSQL_BIN\" \"$RENDER_DATABASE_URL\" -c '\\dt'"
