# routes/news.py

from flask import Blueprint, request, jsonify
from app import db
from models.newsModel import News, StatusEnum, TagEnum
from routes.decorators import token_required, role_required
from datetime import datetime, timezone

news_routes = Blueprint('news_routes', __name__)


def parse_tags(tags_raw):
    if not tags_raw:
        return []
    if isinstance(tags_raw, list):
        tags = [str(t).strip().upper() for t in tags_raw if t]
    else:
        tags = [t.strip().upper() for t in str(tags_raw).split(',') if t.strip()]
    # keep only valid TagEnum values
    valid = []
    for t in tags:
        try:
            # allow either name or value
            if t in TagEnum.__members__:
                valid.append(TagEnum[t])
            else:
                valid.append(TagEnum(t))
        except Exception:
            # ignore invalid tags
            continue
    return valid


def parse_datetime(dt_raw):
    """Parse an ISO datetime string or timestamp into a datetime object.
    Returns None if dt_raw is falsy. Raises ValueError if provided but invalid.
    """
    if not dt_raw:
        return None
    # If it's already a datetime, return as-is
    if isinstance(dt_raw, datetime):
        return dt_raw
    # If numeric, treat as epoch seconds
    if isinstance(dt_raw, (int, float)):
        return datetime.fromtimestamp(dt_raw)
    # Otherwise expect a string in ISO format. Support trailing Z.
    if isinstance(dt_raw, str):
        s = dt_raw.strip()
        # fromisoformat doesn't accept Z, convert to +00:00
        if s.endswith('Z'):
            s = s[:-1] + '+00:00'
        try:
            return datetime.fromisoformat(s)
        except Exception as e:
            raise ValueError(f"Invalid datetime format: {dt_raw}")
    raise ValueError(f"Unsupported datetime value: {dt_raw}")


@news_routes.route('/news', methods=['POST'])
@token_required
def create_news():
    data = request.get_json() or {}
    title = data.get('title')
    content = data.get('content')
    tags_raw = data.get('tags')
    start_raw = data.get('start_date')
    end_raw = data.get('end_date')
    link = data.get('link')
    
    # Validate link
    if link is not None:
        if not isinstance(link, str):
            return jsonify({'error': 'link deve ser uma string'}), 400
        link = link.strip()
        if len(link) > 200:
            return jsonify({'error': 'link deve ter no máximo 200 caracteres'}), 400
        # Optional: basic URL format check
        import re
        url_regex = r'^(https?://|www\.)[\w\-]+(\.[\w\-]+)+[/#?]?.*$'
        if link and not re.match(url_regex, link, re.IGNORECASE):
            return jsonify({'error': 'link deve ser uma URL válida'}), 400

    if not title or not content:
        return jsonify({'error': 'title e content são obrigatórios'}), 400

    tags = parse_tags(tags_raw)

    # If admin, publish directly
    user = getattr(request, 'user', None)
    if user and user.role.value == 'ADMIN':
        status = StatusEnum.ACEITA
        active = True
    else:
        status = StatusEnum.PENDENTE
        active = False

    # parse dates if provided
    try:
        start_date = parse_datetime(start_raw)
    except ValueError:
        return jsonify({'error': 'start_date em formato inválido. Use ISO 8601.'}), 400
    try:
        end_date = parse_datetime(end_raw)
    except ValueError:
        return jsonify({'error': 'end_date em formato inválido. Use ISO 8601.'}), 400

    if start_date and end_date and end_date < start_date:
        return jsonify({'error': 'end_date não pode ser anterior a start_date'}), 400

    news = News(title=title, content=content, author_id=user.id if user else None, status=status, active=active, link=link)
    
    if start_date:
        news.start_date = start_date
    if end_date:
        news.end_date = end_date
    if tags:
        news.tags = tags

    db.session.add(news)
    db.session.commit()
    # Se notícia criada já está ativa, notificar usuários
    if active:
        from services.notification_service import notify_users_for_news
        notify_users_for_news(news)
    return jsonify(news.to_dict()), 201


@news_routes.route('/news', methods=['GET'])
def list_news():
    # Filters: tags (comma or list), status, author_id, active
    q = News.query
    tags_raw = request.args.get('tags')
    status_raw = request.args.get('status')
    author_id = request.args.get('author_id')
    active = request.args.get('active')
    link = request.args.get('link')

    if tags_raw:
        tags = [t.strip().upper() for t in tags_raw.split(',') if t.strip()]
        # keep string values for overlap
        q = q.filter(News.tags.overlap(tags))

    if status_raw:
        status_key = status_raw.strip().upper()
        try:
            status_enum = StatusEnum[status_key]
            q = q.filter(News.status == status_enum)
        except Exception:
            # try value
            try:
                status_enum = StatusEnum(status_key)
                q = q.filter(News.status == status_enum)
            except Exception:
                pass

    if author_id:
        try:
            q = q.filter(News.author_id == int(author_id))
        except Exception:
            pass

    if active is not None:
        if active.lower() in ['true', '1']:
            q = q.filter(News.active.is_(True))
        elif active.lower() in ['false', '0']:
            q = q.filter(News.active.is_(False))

    # Paginação
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    pagination = q.order_by(News.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    items = [n.to_dict() for n in pagination.items]
    return jsonify({
        'news': items,
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages
    }), 200


@news_routes.route('/news/<int:news_id>', methods=['GET'])
def get_news(news_id):
    n = News.query.get(news_id)
    if not n:
        return jsonify({'error': 'Notícia não encontrada'}), 404
    return jsonify(n.to_dict()), 200


@news_routes.route('/news/<int:news_id>', methods=['PUT'])
@token_required
def update_news(news_id):
    n = News.query.get(news_id)
    if not n:
        return jsonify({'error': 'Notícia não encontrada'}), 404

    user = getattr(request, 'user', None)
    # Only author or admin
    if not user:
        return jsonify({'error': 'Autenticação necessária'}), 401
    if user.id != n.author_id and user.role.value != 'ADMIN':
        return jsonify({'error': 'Permissão negada'}), 403

    data = request.get_json() or {}
    n.title = data.get('title', n.title)
    n.content = data.get('content', n.content)
    tags = parse_tags(data.get('tags'))
    if tags:
        n.tags = tags

    # Validate and update link
    if 'link' in data:
        link = data.get('link')
        if link is not None:
            if not isinstance(link, str):
                return jsonify({'error': 'link deve ser uma string'}), 400
            link = link.strip()
            if len(link) > 200:
                return jsonify({'error': 'link deve ter no máximo 200 caracteres'}), 400
            import re
            url_regex = r'^(https?://|www\.)[\w\-]+(\.[\w\-]+)+[/#?]?.*$'
            if link and not re.match(url_regex, link, re.IGNORECASE):
                return jsonify({'error': 'link deve ser uma URL válida'}), 400
            n.link = link
        else:
            n.link = None

    # parse and set optional dates
    if 'start_date' in data:
        try:
            sd = parse_datetime(data.get('start_date'))
        except ValueError:
            return jsonify({'error': 'start_date em formato inválido. Use ISO 8601.'}), 400
        n.start_date = sd
    if 'end_date' in data:
        try:
            ed = parse_datetime(data.get('end_date'))
        except ValueError:
            return jsonify({'error': 'end_date em formato inválido. Use ISO 8601.'}), 400
        n.end_date = ed

    if n.start_date and n.end_date and n.end_date < n.start_date:
        return jsonify({'error': 'end_date não pode ser anterior a start_date'}), 400

    # If admin updates, accept directly. If author updates, set back to pending for review.
    if user.role.value == 'ADMIN':
        n.status = StatusEnum.ACEITA
        n.active = True
    else:
        n.status = StatusEnum.PENDENTE
        n.active = False

    db.session.commit()
    # Se notícia foi ativada por admin, notificar usuários
    if n.active:
        from services.notification_service import notify_users_for_news
        notify_users_for_news(n)
    return jsonify(n.to_dict()), 200


@news_routes.route('/news/<int:news_id>', methods=['DELETE'])
@token_required
def delete_news(news_id):
    n = News.query.get(news_id)
    if not n:
        return jsonify({'error': 'Notícia não encontrada'}), 404
    user = getattr(request, 'user', None)
    if not user:
        return jsonify({'error': 'Autenticação necessária'}), 401
    if user.id != n.author_id and user.role.value != 'ADMIN':
        return jsonify({'error': 'Permissão negada'}), 403

    db.session.delete(n)
    db.session.commit()
    return jsonify({'message': 'Notícia removida'}), 200


# Admin endpoints
@news_routes.route('/admin/news/pending', methods=['GET'])
@role_required('ADMIN')
@token_required
def list_pending_news():
    items = News.query.filter(News.status == StatusEnum.PENDENTE).order_by(News.created_at.asc()).all()
    return jsonify([n.to_dict() for n in items]), 200


@news_routes.route('/admin/news/<int:news_id>/approve', methods=['POST'])
@role_required('ADMIN')
@token_required
def approve_news(news_id):
    n = News.query.get(news_id)
    if not n:
        return jsonify({'error': 'Notícia não encontrada'}), 404
    n.status = StatusEnum.ACEITA
    n.active = True
    db.session.commit()
    # Notificar usuários quando notícia aprovada
    from services.notification_service import notify_users_for_news
    notify_users_for_news(n)
    return jsonify(n.to_dict()), 200


@news_routes.route('/admin/news/<int:news_id>/reject', methods=['POST'])
@role_required('ADMIN')
@token_required
def reject_news(news_id):
    n = News.query.get(news_id)
    if not n:
        return jsonify({'error': 'Notícia não encontrada'}), 404
    n.status = StatusEnum.REJEITADA
    n.active = False
    db.session.commit()
    return jsonify(n.to_dict()), 200
