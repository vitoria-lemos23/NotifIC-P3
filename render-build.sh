#!/usr/bin/env bash
set -euo pipefail

# Wrapper for Render: if build runs from repo root, forward to backend script
if [ -f src/backend/render-build.sh ]; then
  exec bash src/backend/render-build.sh
else
  echo "src/backend/render-build.sh not found" >&2
  exit 1
fi
