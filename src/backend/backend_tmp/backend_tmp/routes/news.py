# routes/news.py

from flask import Blueprint, request, jsonify, render_template, current_app, url_for
import jwt
from models.userModel import User
from app import db
from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql import text
from models.newsModel import News, StatusEnum, TagEnum
from routes.decorators import token_required, role_required
from datetime import datetime, timezone, timedelta
import json
import os
from werkzeug.utils import secure_filename

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
    """Analisa uma string ISO de data/hora ou timestamp para um objeto datetime.
    Retorna None se dt_raw for falso. Lança ValueError se fornecido mas inválido.
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
    
    # Validar link
    if link is not None:
        if not isinstance(link, str):
            return jsonify({'error': 'link deve ser uma string'}), 400
        link = link.strip()
        if len(link) > 200:
            return jsonify({'error': 'link deve ter no máximo 200 caracteres'}), 400
    # Opcional: verificação básica de formato de URL
        import re
        url_regex = r'^(https?://|www\.)[\w\-]+(\.[\w\-]+)+[/#?]?.*$'
        if link and not re.match(url_regex, link, re.IGNORECASE):
            return jsonify({'error': 'link deve ser uma URL válida'}), 400

    if not title or not content:
        return jsonify({'error': 'title e content são obrigatórios'}), 400

    tags = parse_tags(tags_raw)

    # Se for admin, publica diretamente
    user = getattr(request, 'user', None)
    if user and user.role.value == 'ADMIN':
        status = StatusEnum.ACEITA
        active = True
    else:
        status = StatusEnum.PENDENTE
        active = False

    # analisa as datas se fornecidas
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

    # Image persistence removed: image uploads are no longer stored on the News model.

    db.session.add(news)
    try:
        db.session.commit()
    except IntegrityError as e:
        # Handle possible sequence mismatch (e.g., after seeding static JSON)
        db.session.rollback()
        try:
            if 'news_pkey' in str(e.orig) or 'duplicate key value' in str(e.orig).lower():
                current_app.logger.warning('IntegrityError on News insert, attempting to fix news id sequence')
                # set the sequence to the current max(id) so nextval yields max+1
                seq_fix_sql = "SELECT setval(pg_get_serial_sequence('news','id'), COALESCE((SELECT MAX(id) FROM news), 0))"
                db.session.execute(text(seq_fix_sql))
                db.session.commit()
                # retry insert
                db.session.add(news)
                db.session.commit()
            else:
                raise
        except Exception:
            current_app.logger.exception('Failed to recover from IntegrityError when inserting News')
            db.session.rollback()
            return jsonify({'error': 'Erro ao salvar notícia (integrity error).'}), 500
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
    # Tenta enriquecer os itens com imagens do JSON estático, se presentes
    # (sem alteração no esquema do BD)
    try:
        static_path = os.path.join(current_app.static_folder, 'json', 'noticias.json')
        if os.path.exists(static_path):
            with open(static_path, 'r', encoding='utf-8') as f:
                static_list = json.load(f)
            static_map = {int(s.get('id')): s for s in static_list if s.get('id') is not None}
            for it in items:
                sid = it.get('id')
                if sid and sid in static_map:
                    s = static_map[sid]
                    # preserva campos já retornados pelo BD; adiciona campos de imagem se faltarem
                    if s.get('img') and not it.get('img'):
                        it['img'] = s.get('img')
                    if s.get('imagem_banner') and not it.get('imagem_banner'):
                        it['imagem_banner'] = s.get('imagem_banner')
    except Exception:
        # não fatal: se o arquivo estático faltar ou for inválido, continua sem enriquecimento
        pass
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
    data = n.to_dict()
    # adiciona campos de imagem vindos do JSON estático, se disponíveis
    try:
        static_path = os.path.join(current_app.static_folder, 'json', 'noticias.json')
        if os.path.exists(static_path):
            with open(static_path, 'r', encoding='utf-8') as f:
                static_list = json.load(f)
            for s in static_list:
                if s.get('id') is not None and int(s.get('id')) == int(news_id):
                    if s.get('img') and not data.get('img'):
                        data['img'] = s.get('img')
                    if s.get('imagem_banner') and not data.get('imagem_banner'):
                        data['imagem_banner'] = s.get('imagem_banner')
                    break
    except Exception:
        pass
    return jsonify(data), 200


# Endpoint to upload an image file and return a static path to be saved on a News record
@news_routes.route('/upload-image', methods=['POST'])
@token_required
def upload_image():
    # Expects multipart/form-data with file field 'file' or 'foto'
    if 'file' in request.files:
        f = request.files['file']
    elif 'foto' in request.files:
        f = request.files['foto']
    else:
        return jsonify({'error': 'No file part'}), 400

    return jsonify({'error': 'Image uploads are disabled in this deployment.'}), 410


@news_routes.route('/news/<int:news_id>', methods=['PUT'])
@token_required
def update_news(news_id):
    n = News.query.get(news_id)
    if not n:
        return jsonify({'error': 'Notícia não encontrada'}), 404

    user = getattr(request, 'user', None)
    # Apenas autor ou admin
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

    # Validar e atualizar link
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

    # analisar e definir datas opcionais
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

    # Se admin atualizar, aceita diretamente. Se autor atualizar, volta para PENDENTE para revisão.
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


# Renderização da página de cadastro/visualização de notícia
@news_routes.route('/cadastrar-noticia', methods=['GET', 'POST'])
def news_page():
    if request.method == 'GET':
        usuario = None
        token = request.cookies.get('access_token')
        if token:
            try:
                payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
                user = User.query.get(payload.get('user_id'))
                if user:
                    usuario = user.to_dict()
            except Exception:
                usuario = None
        return render_template('page_feed.html', usuario=usuario)

    # POST: submissão de notícia via formulário; exige usuário autenticado (cookie)
    data = request.get_json() or {}
    token = request.cookies.get('access_token')
    if not token:
        # fallback to Authorization header
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token.split(' ')[1]
    if not token:
        return jsonify({'error': 'Autenticação necessária. Faça login.'}), 401

    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user = User.query.get(payload.get('user_id'))
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token expirado'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Token inválido'}), 401

    title = data.get('title') or data.get('nome')
    content = data.get('content') or data.get('descricao') or data.get('descricao')
    link = data.get('link') or data.get('site')
    tags_raw = data.get('tags')
    start_raw = data.get('start_date') or data.get('data-inicio')
    end_raw = data.get('end_date') or data.get('data-fim')

    if not title or not content:
        return jsonify({'error': 'title e content são obrigatórios'}), 400

    try:
        start_date = parse_datetime(start_raw) if start_raw else None
        end_date = parse_datetime(end_raw) if end_raw else None
    except ValueError:
        return jsonify({'error': 'Formato de data inválido. Use ISO 8601.'}), 400

    if start_date and end_date and end_date < start_date:
        return jsonify({'error': 'end_date não pode ser anterior a start_date'}), 400

    tags = []
    if tags_raw:
        try:
            tags = parse_tags(tags_raw)
        except Exception:
            tags = []

    # If admin, accept directly; otherwise leave as pending
    if user.role.value == 'ADMIN':
        status = StatusEnum.ACEITA
        active = True
    else:
        status = StatusEnum.PENDENTE
        active = False

    # Rate limit: users with role USUARIO can only submit once every 5 minutes
    try:
        if user.role.value == 'USUARIO':
            five_minutes_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
            last = News.query.filter(News.author_id == user.id).order_by(News.created_at.desc()).first()
            if last and last.created_at and last.created_at > five_minutes_ago:
                # calcula tempo restante em segundos
                remaining = (last.created_at + timedelta(minutes=5) - datetime.now(timezone.utc)).total_seconds()
                minutes = int(remaining // 60)
                seconds = int(remaining % 60)
                return jsonify({'error': f'Você só pode submeter uma notícia a cada 5 minutos. Tente novamente em {minutes}m{seconds}s.'}), 429
    except Exception:
        # Não falhar a submissão por erro na verificação de rate-limit; apenas logar e continuar
        current_app.logger.exception('Erro ao verificar rate limit de submissão de notícia')

    news = News(title=title, content=content, author_id=user.id, status=status, link=link)
    if start_date:
        news.start_date = start_date
    if end_date:
        news.end_date = end_date
    if tags:
        news.tags = tags

    db.session.add(news)
    try:
        db.session.commit()
    except IntegrityError as e:
        db.session.rollback()
        try:
            if 'news_pkey' in str(e.orig) or 'duplicate key value' in str(e.orig).lower():
                current_app.logger.warning('IntegrityError on News insert (cadastrar-noticia), attempting to fix news id sequence')
                seq_fix_sql = "SELECT setval(pg_get_serial_sequence('news','id'), COALESCE((SELECT MAX(id) FROM news), 0))"
                db.session.execute(text(seq_fix_sql))
                db.session.commit()
                # retry insert
                db.session.add(news)
                db.session.commit()
            else:
                raise
        except Exception:
            current_app.logger.exception('Failed to recover from IntegrityError when inserting News (cadastrar-noticia)')
            db.session.rollback()
            return jsonify({'error': 'Erro ao salvar notícia (integrity error).'}), 500

    # If news activated, notify
    if active:
        from services.notification_service import notify_users_for_news
        notify_users_for_news(news)

    return jsonify({'message': 'Notícia submetida', 'news': news.to_dict()}), 201



@news_routes.route('/noticia', methods=['GET'])
def render_news_template():
    """Render the news detail page template. The page's JS will fetch the news
    data from GET /news/<id>. We inject `usuario` when available so templates
    that expect server-driven user info keep working.
    """
    usuario = None
    token = request.cookies.get('access_token')
    if token:
        try:
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            user = User.query.get(payload.get('user_id'))
            if user:
                usuario = user.to_dict()
        except Exception:
            usuario = None
    return render_template('news.html', usuario=usuario)