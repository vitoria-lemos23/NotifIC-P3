# Wrapper WSGI at repository root to make module import consistent for gunicorn
# This imports the application created in src/backend/wsgi.py and exposes `app`.

try:
    from src.backend.wsgi import app  # prefer package-style import
except Exception:
    # Fallback: try to import from backend top-level if package path differs
    from importlib import import_module
    mod = import_module('wsgi', package=None)
    app = getattr(mod, 'app')
