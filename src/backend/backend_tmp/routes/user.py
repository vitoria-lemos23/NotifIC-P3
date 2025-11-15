# routes/user.py
from flask import Blueprint, request, jsonify, render_template, current_app
import jwt
from models.userModel import User, RoleEnum
from app import db
from routes.decorators import token_required, role_required
from models.newsModel import News

user_routes = Blueprint('user_routes', __name__)

# CREATE
@user_routes.route('/user', methods=['POST'])
def criar_usuario():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role = RoleEnum.USUARIO  # padrão

    if not username or not email or not password:
        return jsonify({'error': 'username, email e password são obrigatórios'}), 400

    if User.query.filter_by(username=username).first() or User.query.filter_by(email=email).first():
        return jsonify({'error': 'Usuário ou email já existe'}), 409

    user = User(username=username, email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

# READ ALL
@user_routes.route('/user', methods=['GET'])
def listar_usuarios():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200

# READ ONE
@user_routes.route('/user/<int:user_id>', methods=['GET'])
def obter_usuario(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    return jsonify(user.to_dict()), 200


# Rota para obter informações do próprio usuário a partir do token
# Protegida pelo decorator token_required que popula `request.user`
@user_routes.route('/me', methods=['GET'])
@token_required
def me():
    """Retorna informações do usuário autenticado.

    Usa o decorator `token_required` que valida o token JWT e anexa
    o objeto usuário em `request.user`.
    """
    user = getattr(request, 'user', None)
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    return jsonify(user.to_dict()), 200


# Renderização da página de perfil (server-driven)
@user_routes.route('/perfil', methods=['GET'])
def perfil():
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
    return render_template('paginaUsuario.html', usuario=usuario)


# Public profile view for any user by id (renders same template but with that user's data)
@user_routes.route('/perfil/<int:user_id>', methods=['GET'])
def perfil_public(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    # Render the same template but inject the requested user's data as `usuario`
    return render_template('paginaUsuario.html', usuario=user.to_dict())


# Favoritos: listar e alternar (toggle) para o usuário autenticado
@user_routes.route('/user/favorites', methods=['GET'])
def list_favorites():
    # try cookie-based token first (HttpOnly cookie)
    token = request.cookies.get('access_token')
    if not token:
        # fallback to Authorization header
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token.split(' ')[1]
    if not token:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user = User.query.get(payload.get('user_id'))
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        favs = [n.to_dict() for n in user.favorite_news]
        return jsonify({'favorites': favs}), 200
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token expirado'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Token inválido'}), 401


@user_routes.route('/user/favorites', methods=['POST'])
def toggle_favorite():
    # support cookie-based token or Authorization header
    token = request.cookies.get('access_token')
    if not token:
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token.split(' ')[1]
    if not token:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user = User.query.get(payload.get('user_id'))
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        data = request.get_json() or {}
        # log minimal info to console for debugging (database URL, user and payload summary)
        try:
            current_app.logger.info(f"[favorites] DB={current_app.config.get('SQLALCHEMY_DATABASE_URI')} user_id={user.id} payload_keys={list(data.keys())}")
        except Exception:
            # fallback to print if logger misconfigured
            print(f"[favorites] user_id={getattr(user,'id',None)} payload_keys={list(data.keys())}")
        # accept either { news_id } or full news payload { id, title, content, ... }
        news_id = data.get('news_id')

        news = None
        if news_id:
            news = News.query.get(int(news_id))

        # If news not found, try to create from payload (fallback for static JSON items)
        if not news:
            # require at least a title or id in payload
            title = data.get('title')
            if not title and not news_id:
                return jsonify({'error': 'news_id ou título da notícia necessários'}), 400

            try:
                # If the client provided an external id, try to use it as the DB id so client-side ids match
                external_id = data.get('id')
                if external_id:
                    # ensure there's no existing news with that id
                    existing = News.query.get(int(external_id))
                    if existing:
                        news = existing
                    else:
                        news = News(
                            id=int(external_id),
                            title=title or f'Notícia {external_id}',
                            content=data.get('content') or data.get('desc') or '',
                            author_id=user.id,
                            link=data.get('link')
                        )
                        db.session.add(news)
                        db.session.commit()
                        # update sequence for Postgres serial to avoid future conflicts
                        try:
                            db.session.execute("SELECT setval(pg_get_serial_sequence('news','id'), (SELECT COALESCE(MAX(id), 1) FROM news));")
                            db.session.commit()
                        except Exception:
                            db.session.rollback()
                else:
                    news = News(
                        title=title or f'Notícia {news_id or "tmp"}',
                        content=data.get('content') or data.get('desc') or '',
                        author_id=user.id,
                        link=data.get('link')
                    )
                    db.session.add(news)
                    db.session.commit()
            except Exception as e:
                db.session.rollback()
                return jsonify({'error': 'Falha ao criar notícia temporária', 'detail': str(e)}), 500

        # toggle favorite
        if news in user.favorite_news:
            user.favorite_news.remove(news)
            db.session.commit()
            # return updated favorites for client verification
            favs = [n.id for n in user.favorite_news]
            current_app.logger.info(f"Removed favorite: user={user.id} news={news.id} favorites={favs}")
            return jsonify({'message': 'Removido dos favoritos', 'news_id': news.id, 'favorites': favs}), 200
        else:
            user.favorite_news.append(news)
            db.session.commit()
            favs = [n.id for n in user.favorite_news]
            current_app.logger.info(f"Added favorite: user={user.id} news={news.id} favorites={favs}")
            return jsonify({'message': 'Adicionado aos favoritos', 'news_id': news.id, 'favorites': favs}), 201
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token expirado'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Token inválido'}), 401

# UPDATE
@user_routes.route('/user/<int:user_id>', methods=['PUT'])
@token_required
def atualizar_usuario(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404

    # Garante que só o dono pode atualizar
    if request.user.id != user_id:
        return jsonify({'error': 'Você só pode atualizar sua própria conta'}), 403

    data = request.get_json()
    user.username = data.get('username', user.username)
    user.email = data.get('email', user.email)
    # role só pode ser alterado por administradores via API
    role = data.get('role')
    requester = getattr(request, 'user', None)
    if role and requester and getattr(requester, 'role', None) and requester.role.value == 'ADMIN':
        # aceitar valor somente se for um dos enums
        try:
            user.role = RoleEnum[role]
        except Exception:
            # não aplicar role inválida
            pass
    password = data.get('password')
    if password:
        user.set_password(password)
    db.session.commit()
    return jsonify(user.to_dict()), 200

# DELETE
@user_routes.route('/user/<int:user_id>', methods=['DELETE'])
@role_required('ADMIN')
@token_required
def deletar_usuario(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'Usuário deletado com sucesso'}), 200