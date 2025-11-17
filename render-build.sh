#!/usr/bin/env bash
set -euo pipefail

# render-build.sh
# Robust build helper for Render: choose the correct requirements file
# and install dependencies. Use this as the Build Command in Render:
#   bash render-build.sh

echo "Starting render build helper..."

# Resolve the directory containing this script (repo root when script is in repo root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/requirements.txt" ]; then
  REQ="$SCRIPT_DIR/requirements.txt"
elif [ -f "$SCRIPT_DIR/src/backend/requirements.txt" ]; then
  REQ="$SCRIPT_DIR/src/backend/requirements.txt"
elif [ -f "$SCRIPT_DIR/backend/requirements.txt" ]; then
  REQ="$SCRIPT_DIR/backend/requirements.txt"
else
  echo "ERROR: No requirements file found in repo root, src/backend or backend" >&2
  exit 1
fi

echo "Using requirements file: $REQ"
python -m pip install --upgrade pip
python -m pip install -r "$REQ"

echo "Dependencies installed from $REQ"
