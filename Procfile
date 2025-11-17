web: bash render-build.sh && cd src/backend && python -m flask --app wsgi db upgrade && gunicorn wsgi:app --bind 0.0.0.0:$PORT
