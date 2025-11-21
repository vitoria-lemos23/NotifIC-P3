#!/usr/bin/env bash
set -euo pipefail

# Ensure gunicorn is installed (helps when requirements don't include it in build)
python -m pip install --upgrade pip || true
python -m pip install --no-cache-dir gunicorn==20.1.0 || true

cd src/backend
exec gunicorn --bind 0.0.0.0:${PORT:-5000} app:app --workers 2
