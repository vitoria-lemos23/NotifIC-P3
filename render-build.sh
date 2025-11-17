#!/usr/bin/env bash
set -euo pipefail

# render-build.sh
# Robust build helper for Render: choose the correct requirements file
# and install dependencies. Use this as the Build Command in Render:
#   bash render-build.sh

echo "Starting render build helper..."

if [ -f requirements.txt ]; then
  REQ=requirements.txt
elif [ -f src/backend/requirements.txt ]; then
  REQ=src/backend/requirements.txt
elif [ -f backend/requirements.txt ]; then
  REQ=backend/requirements.txt
else
  echo "ERROR: No requirements file found in repo root, src/backend or backend" >&2
  exit 1
fi

echo "Using requirements file: $REQ"
python -m pip install --upgrade pip
python -m pip install -r "$REQ"

echo "Dependencies installed from $REQ"
