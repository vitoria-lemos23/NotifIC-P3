#!/usr/bin/env bash
set -euo pipefail

# render-build.sh
# Robust build helper for Render: choose the correct requirements file
# and install dependencies. Use this as the Build Command in Render:
#   bash render-build.sh

echo "Starting render build helper..."

# Resolve the directory containing this script (repo root when script is in repo root)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Candidate locations to check (handles Render's /opt/render/project/src working dir
# and the repo root). We test both direct and one-level-up paths to avoid duplicated
# 'src/backend' when Render runs the build from a different CWD.
candidates=(
  "$SCRIPT_DIR/requirements.txt"
  "$SCRIPT_DIR/src/backend/requirements.txt"
  "$SCRIPT_DIR/backend/requirements.txt"
  "$SCRIPT_DIR/../requirements.txt"
  "$SCRIPT_DIR/../src/backend/requirements.txt"
  "$SCRIPT_DIR/../backend/requirements.txt"
)

REQ=""
for p in "${candidates[@]}"; do
  # normalize path
  realp=$(realpath -e "$p" 2>/dev/null || true)
  if [ -n "$realp" ] && [ -f "$realp" ]; then
    REQ="$realp"
    break
  fi
done

if [ -z "$REQ" ]; then
  echo "ERROR: No requirements file found in expected locations." >&2
  echo "Searched: ${candidates[*]}" >&2
  exit 1
fi

echo "Using requirements file: $REQ"
python -m pip install --upgrade pip
python -m pip install -r "$REQ"

echo "Dependencies installed from $REQ"
