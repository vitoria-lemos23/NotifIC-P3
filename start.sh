#!/usr/bin/env sh
set -e

# Entrar no diretório do backend e preparar o ambiente
cd src/backend

# Instalar dependências (Railway geralmente já instala, mas garantir)
pip install -r requirements.txt

# Rodar migrations/initialização do banco (se o DATABASE_URL estiver disponível)
# Se falhar, continua para iniciar o servidor (ajuste se quiser que falhe)
python create_db.py --database-url "$DATABASE_URL" || true

# Iniciar Gunicorn
exec gunicorn wsgi:app --workers 4 --bind 0.0.0.0:$PORT
