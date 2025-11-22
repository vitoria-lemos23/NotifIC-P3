#!/usr/bin/env bash
set -euo pipefail

# Convert src/backend submodule into a normal tracked directory (Bash)
# Usage: from repository root:
#   ./scripts/convert_submodule.sh

SUBMODULE_PATH="src/backend"
TS=$(date +%Y%m%d-%H%M%S)
BACKUP="../backend-backup-$TS"

echo "This script will convert '$SUBMODULE_PATH' from a git submodule into a regular directory."
read -p "Proceed and create backup at $BACKUP ? (type 'yes' to continue): " ans
if [[ "$ans" != "yes" ]]; then
  echo "Aborted by user."; exit 0
fi

if [[ ! -d .git ]]; then
  echo "This does not look like a repository root (no .git)."; exit 1
fi

echo "Creating backup..."
if [[ -d "$SUBMODULE_PATH" ]]; then
  cp -a "$SUBMODULE_PATH" "$BACKUP"
else
  echo "Warning: $SUBMODULE_PATH not found — continuing." >&2
fi

echo "Deinitializing submodule..."
git submodule deinit -f -- "$SUBMODULE_PATH" || true

echo "Staging .gitmodules if changed..."
git add .gitmodules || true

echo "Removing submodule from index (git rm -f)..."
git rm -f "$SUBMODULE_PATH" || true

echo "Removing submodule metadata if present..."
if [[ -d ".git/modules/$SUBMODULE_PATH" ]]; then
  rm -rf ".git/modules/$SUBMODULE_PATH"
fi

if [[ ! -d "$SUBMODULE_PATH" && -d "$BACKUP" ]]; then
  echo "Restoring files from backup to $SUBMODULE_PATH"
  mv "$BACKUP" "$SUBMODULE_PATH"
fi

echo "Adding files and committing..."
git add "$SUBMODULE_PATH" || true
git add .gitmodules || true

BRANCH=$(git rev-parse --abbrev-ref HEAD)
MSG="Convert $SUBMODULE_PATH submodule into normal directory"
git commit -m "$MSG" || echo "Nothing to commit or commit failed. Inspect status." >&2

echo "Pushing to origin/$BRANCH"
git push origin "$BRANCH"

echo "Conversion script finished. Keep backup at: $BACKUP until you verify everything."
