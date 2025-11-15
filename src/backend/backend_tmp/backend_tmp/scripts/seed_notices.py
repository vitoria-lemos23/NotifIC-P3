# Garante que o pacote backend é importável quando o script é executado diretamente.
import sys
import json
import os
from sqlalchemy import text

# Insere a pasta pai `src/backend` em sys.path para que `import app` funcione
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_THIS_DIR)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

"""
Script de seed para popular a tabela `news` a partir do JSON fornecido.

Uso (a partir da raiz do repositório, com virtualenv ativado):
    python src/backend/scripts/seed_notices.py

O script usa o SQLAlchemy `db` da aplicação para inserir/atualizar registros
e ajusta a sequência do Postgres para o maior id inserido, evitando conflitos
com inserts futuros.

O módulo importa a factory da aplicação para executar dentro do contexto do app.
"""
from app import create_app, db
from models.newsModel import News, StatusEnum, TagEnum

APP = create_app()

JSON_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'static', 'json', 'noticias.json')

# Map string status/tags from JSON to enums used in model

def map_status(s):
    if not s:
        return StatusEnum.PENDENTE
    s = str(s).upper()
    try:
        return StatusEnum[s]
    except KeyError:
        # try by value
        for st in StatusEnum:
            if st.value == s:
                return st
        return StatusEnum.PENDENTE


def map_tags(tags):
    if not tags:
        return []
    mapped = []
    for t in tags:
        if not t:
            continue
        tstr = str(t).upper()
        try:
            if tstr in TagEnum.__members__:
                mapped.append(TagEnum[tstr])
            else:
                # try value
                for te in TagEnum:
                    if te.value == tstr:
                        mapped.append(te)
                        break
        except Exception:
            continue
    return mapped


def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def upsert_news_items(items):
    with APP.app_context():
        for it in items:
            nid = it.get('id')
            # try to find existing by id
            existing = None
            if nid is not None:
                # Use Session.get to avoid SQLAlchemy 2.0 legacy Query.get warning
                try:
                    existing = db.session.get(News, nid)
                except Exception:
                    # fallback to the older Query.get if unavailable
                    existing = News.query.get(nid)
            if existing:
                print(f'Updating news id={nid} title="{it.get("title")}"')
                existing.title = it.get('title') or existing.title
                existing.content = it.get('content') or existing.content
                existing.link = it.get('link') or existing.link
                existing.hotNews = bool(it.get('hotNews'))
                existing.status = map_status(it.get('status'))
                tags = map_tags(it.get('tags') or [])
                if tags:
                    existing.tags = tags
                # set dates if provided
                if it.get('start_date'):
                    try:
                        from datetime import datetime
                        existing.start_date = datetime.fromisoformat(it.get('start_date').replace('Z', '+00:00'))
                    except Exception:
                        pass
                if it.get('end_date'):
                    try:
                        from datetime import datetime
                        existing.end_date = datetime.fromisoformat(it.get('end_date').replace('Z', '+00:00'))
                    except Exception:
                        pass
                db.session.add(existing)
            else:
                print(f'Inserting news id={nid} title="{it.get("title")}"')
                news = News(
                    id = nid,
                    title = it.get('title') or 'Sem título',
                    content = it.get('content') or '',
                    author_id = it.get('author_id'),
                    link = it.get('link') or None,
                    hotNews = bool(it.get('hotNews')),
                    status = map_status(it.get('status')),
                )
                tags = map_tags(it.get('tags') or [])
                if tags:
                    news.tags = tags
                # parse dates
                if it.get('start_date'):
                    try:
                        from datetime import datetime
                        news.start_date = datetime.fromisoformat(it.get('start_date').replace('Z', '+00:00'))
                    except Exception:
                        pass
                if it.get('end_date'):
                    try:
                        from datetime import datetime
                        news.end_date = datetime.fromisoformat(it.get('end_date').replace('Z', '+00:00'))
                    except Exception:
                        pass
                # created_at/updated_at are left to DB defaults if not provided
                db.session.add(news)
        db.session.commit()

        # Fix sequence for Postgres to avoid conflicts (robust bind detection)
        try:
            # Try several ways to get the current engine/bind
            bind = None
            try:
                bind = db.session.get_bind()
            except Exception:
                try:
                    # Flask-SQLAlchemy exposes get_engine in newer versions
                    bind = db.get_engine()
                except Exception:
                    bind = db.session.bind

            dialect_name = None
            if bind is not None:
                dialect = getattr(bind, 'dialect', None)
                dialect_name = getattr(dialect, 'name', None)

            if dialect_name == 'postgresql':
                # determine sequence name for news.id
                seq_sql = text("SELECT pg_get_serial_sequence('news','id')")
                seq_name = db.session.execute(seq_sql).scalar()
                if seq_name:
                    # set seq to max(id)
                    max_id = db.session.execute(text('SELECT COALESCE(MAX(id), 0) FROM news')).scalar() or 0
                    setval_sql = text("SELECT setval(:seq, :val, true)")
                    db.session.execute(setval_sql.bindparams(seq=seq_name, val=max_id))
                    db.session.commit()
                    print(f"Set sequence {seq_name} to {max_id}")
            else:
                print('Sequence not adjusted: DB dialect not detected as postgresql (detected: %s)' % dialect_name)
        except Exception as e:
            print('Could not adjust sequence:', e)


if __name__ == '__main__':
    if not os.path.exists(JSON_PATH):
        print('JSON file not found at', JSON_PATH)
        raise SystemExit(1)
    items = load_json(JSON_PATH)
    upsert_news_items(items)
    print('Seeding complete.')
