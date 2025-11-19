import os
import sys

# Wrapper WSGI entrypoint for Render/Gunicorn
# Ensures the backend package directory is on sys.path and exposes `app`.
ROOT = os.path.dirname(__file__)
BACKEND_PATH = os.path.join(ROOT, 'src', 'backend')
if BACKEND_PATH not in sys.path:
    sys.path.insert(0, BACKEND_PATH)

try:
    # Prefer importing the backend wsgi.py as a top-level module (works when BACKEND_PATH is on sys.path)
    import wsgi as _wsgi
    app = getattr(_wsgi, 'app')
except Exception:
    # Fallback: try importing the fully-qualified module if the repo layout exposes `src` as a package
    from importlib import import_module
    _mod = import_module('src.backend.wsgi')
    app = getattr(_mod, 'app')
