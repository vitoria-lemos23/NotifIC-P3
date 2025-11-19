#!/usr/bin/env bash
set -euo pipefail

echo "Starting render build helper..."

# Initialize git submodules if any (safe to run even if none)
git submodule update --init --recursive || true

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Candidate requirements paths (prefer root then backend)
candidates=("$REPO_DIR/requirements.txt" "$REPO_DIR/src/backend/requirements.txt" "$REPO_DIR/src/requirements.txt")
REQ_FILE=""
for f in "${candidates[@]}"; do
  if [ -f "$f" ]; then
    REQ_FILE="$f"
    break
  fi
done

if [ -z "$REQ_FILE" ]; then
  echo "No requirements.txt found in repo root or src/backend. Exiting." >&2
  exit 1
fi

echo "Using requirements file: $REQ_FILE"
python -m pip install --upgrade pip
python -m pip install -r "$REQ_FILE"
