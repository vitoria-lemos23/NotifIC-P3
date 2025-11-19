import os
import sys
import importlib.util

# Wrapper WSGI entrypoint for Render/Gunicorn
# Ensures the backend package directory is on sys.path and exposes `app`.
ROOT = os.path.dirname(__file__)
BACKEND_PATH = os.path.join(ROOT, 'src', 'backend')
if BACKEND_PATH not in sys.path:
    sys.path.insert(0, BACKEND_PATH)

# Try to load the backend's wsgi.py directly from file to avoid importing this wrapper
backend_wsgi_file = os.path.join(BACKEND_PATH, 'wsgi.py')
app = None
if os.path.isfile(backend_wsgi_file):
    spec = importlib.util.spec_from_file_location('backend_wsgi_module', backend_wsgi_file)
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
        app = getattr(mod, 'app', None)
    except Exception:
        # fall through to next strategy
        app = None

if app is None:
    # Fallback: try importing the fully-qualified module if the repo layout exposes `src` as a package
    try:
        mod = __import__('src.backend.wsgi', fromlist=['app'])
        app = getattr(mod, 'app', None)
    except Exception:
        app = None

if app is None:
    raise RuntimeError('Could not import backend WSGI app (tried src/backend/wsgi.py and src.backend.wsgi)')
