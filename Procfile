web: bash render-build.sh && cd src/backend && FLASK_APP=app.py flask db upgrade && gunicorn wsgi:app --bind 0.0.0.0:$PORT
