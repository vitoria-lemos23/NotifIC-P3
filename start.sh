#!/usr/bin/env sh
set -e

# Entrar no diretório do backend e preparar o ambiente
cd src/backend

# Instalar dependências (Railway/Render geralmente já instala, mas garantir)
python3 -m pip install -r requirements.txt

# Rodar migrations/initialização do banco (se o DATABASE_URL estiver disponível)
# Use python3 to match Render's runtime environment
python3 create_db.py --database-url "$DATABASE_URL" || true

# Iniciar Gunicorn
exec gunicorn wsgi:app --workers 4 --bind 0.0.0.0:$PORT
