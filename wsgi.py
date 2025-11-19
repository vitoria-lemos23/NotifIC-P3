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
app = None
# Try backend wsgi.py first
backend_wsgi_file = os.path.join(BACKEND_PATH, 'wsgi.py')
if os.path.isfile(backend_wsgi_file):
    spec = importlib.util.spec_from_file_location('backend_wsgi_module', backend_wsgi_file)
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
        app = getattr(mod, 'app', None)
    except Exception:
        import traceback
        sys.stderr.write('wsgi wrapper debug: exception while loading backend wsgi.py:\n')
        traceback.print_exc(file=sys.stderr)
        app = None

# If not present, try backend app.py (common entrypoint)
if app is None:
    backend_app_file = os.path.join(BACKEND_PATH, 'app.py')
    if os.path.isfile(backend_app_file):
        spec = importlib.util.spec_from_file_location('backend_app_module', backend_app_file)
        mod = importlib.util.module_from_spec(spec)
        try:
            spec.loader.exec_module(mod)
            app = getattr(mod, 'app', None)
        except Exception:
            import traceback
            sys.stderr.write('wsgi wrapper debug: exception while loading backend app.py:\n')
            traceback.print_exc(file=sys.stderr)
            app = None

# Try importing package-style names as a last resort
if app is None:
    for name in ('src.backend.wsgi', 'src.backend.app', 'app'):
        try:
            mod = __import__(name, fromlist=['app'])
            app = getattr(mod, 'app', None)
            if app is not None:
                break
        except Exception:
            continue

if app is None:
    # Debug info
    sys.stderr.write('wsgi wrapper debug: ROOT=%s\n' % ROOT)
    sys.stderr.write('wsgi wrapper debug: BACKEND_PATH=%s\n' % BACKEND_PATH)
    try:
        entries = os.listdir(BACKEND_PATH)
        sys.stderr.write('wsgi wrapper debug: BACKEND_PATH entries: %s\n' % (', '.join(entries),))
    except Exception as e:
        sys.stderr.write('wsgi wrapper debug: could not list BACKEND_PATH: %s\n' % e)
    raise RuntimeError('Could not import backend WSGI app (tried src/backend/wsgi.py, src/backend/app.py and package imports)')
