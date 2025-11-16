# routes/auth.py

import jwt
import os
from flask import Blueprint, request, jsonify, current_app, make_response
from datetime import datetime, timedelta, timezone
from models.userModel import User
from app import db, mail
from flask_mail import Message
from flask import render_template
from redis import Redis
from rq import Queue
from tasks.email_tasks import send_recovery_email

auth_routes = Blueprint('auth_routes', __name__)

#renderização das páginas de autenticação

@auth_routes.route('/login')
def login_page():
    return render_template('login.html')

@auth_routes.route('/registrar')
def registrar_page():
    return render_template('registrar.html')

@auth_routes.route('/recuperacao')
def recuperacao_senha_page():
    return render_template('recuperacaoSenha.html')

#rotas de login, registro e recuperação de senha

@auth_routes.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Credenciais inválidas'}), 401

    payload = {
        'user_id': user.id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=1)
    }
    token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')

    # Códiogo adicionado para definir o cookie que define que o usuário está logado

    # Decide whether cookie should be marked secure (only over HTTPS in production).
    # Some Flask versions don't expose `app.env`; use the config `ENV` key instead.
    secure_cookie = (current_app.config.get('ENV') == 'production') or (os.getenv('FLASK_ENV') == 'production')

    # Build response with token and user info and set HttpOnly cookie for server-driven sessions
    response = make_response(jsonify({'token': token, 'user': user.to_dict()}))
    # Cookie options: HttpOnly, SameSite Lax to allow POST redirects, secure in production
    response.set_cookie(
        'access_token',
        token,
        httponly=True,
        secure=secure_cookie,
        samesite='Lax',
        max_age=3600,
        path='/'
    )
    return response


@auth_routes.route('/logout', methods=['POST'])
def logout():
    # Clear the access_token cookie
    secure_cookie = (current_app.config.get('ENV') == 'production') or (os.getenv('FLASK_ENV') == 'production')
    response = make_response(jsonify({'message': 'Logged out'}))
    response.set_cookie('access_token', '', expires=0, httponly=True, secure=secure_cookie, path='/')
    return response

@auth_routes.route('/recuperar-senha', methods=['POST'])
def recuperar_senha():
    data = request.get_json()
    email = data.get('email')
    current_app.logger.info('recuperar_senha called for email: %s', email)
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'E-mail não encontrado'}), 404

    # Gera token de redefinição válido por 30 minutos
    payload = {
        'user_id': user.id,
        'exp': datetime.now(timezone.utc) + timedelta(minutes=30)
    }
    token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')

    # Monta e envia o e-mail
    # Build a reset link that works in production. Prefer a configured frontend URL,
    # otherwise fall back to the current request host (which will be the backend URL).
    base_url = current_app.config.get('FRONTEND_URL') or request.host_url.rstrip('/')
    reset_link = f"{base_url}/redefinir-senha?token={token}"

    msg = Message(
        subject='Recuperação de senha',
        sender=current_app.config.get('MAIL_USERNAME'),
        recipients=[email],
        body=f'Use este link para redefinir sua senha: {reset_link}'
    )

    try:
        # Enqueue the send task to RQ so a separate worker handles SMTP
        redis_url = current_app.config.get('REDIS_URL') or os.getenv('REDIS_URL') or 'redis://localhost:6379/0'
        redis_conn = Redis.from_url(redis_url)
        q = Queue('default', connection=redis_conn)
        # enqueue the callable; RQ will import tasks.email_tasks.send_recovery_email
        job = q.enqueue(send_recovery_email, token, email)
        current_app.logger.info('Enqueued recovery email job id=%s for %s', job.id, email)
    except Exception:
        current_app.logger.exception('Falha ao enfileirar e-mail de recuperação')
        return jsonify({'error': 'Falha ao enviar e-mail de recuperação'}), 502

    # For development convenience (college project), optionally return the
    # reset link in the HTTP response when not in production or when the
    # explicit DEV_RETURN_RESET_LINK env var is enabled. This must NOT be
    # enabled in production.
    show_link = (current_app.config.get('ENV') != 'production') or os.getenv('DEV_RETURN_RESET_LINK', '0').lower() in ('1', 'true', 'yes')
    # Temporary debug log: print the environment value and the boolean used
    # to decide whether to include the reset link in responses. Remove after debugging.
    current_app.logger.info('DEV_RETURN_RESET_LINK=%s show_link=%s', os.getenv('DEV_RETURN_RESET_LINK'), show_link)
    resp = {'message': 'E-mail de recuperação enfileirado para envio'}
    if show_link:
        resp['reset_link'] = reset_link
    return jsonify(resp), 200

@auth_routes.route('/redefinir-senha', methods=['GET', 'POST'])
def redefinir_senha():
    # GET: se acessado por navegador, renderiza o formulário de redefinição
    if request.method == 'GET':
        token = request.args.get('token')
        # Se o cliente preferir HTML (navegador), renderize a página com o token
        if request.accept_mimetypes.accept_html:
            return render_template('redefinirSenha.html', token=token)

        # comportamento API: valida o token e retorna JSON
        if not token:
            return jsonify({'error': 'Token ausente'}), 400
        try:
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            user = User.query.get(payload['user_id'])
            if not user:
                return jsonify({'error': 'Usuário não encontrado'}), 404
            return jsonify({'message': 'Token válido, pode redefinir a senha.'}), 200
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expirado'}), 400
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token inválido'}), 400

    # POST: efetua a redefinição usando token e nova senha no corpo
    data = request.get_json() or {}
    token = data.get('token')
    nova_senha = data.get('nova_senha')
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user = User.query.get(payload['user_id'])
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        user.set_password(nova_senha)
        db.session.commit()
        return jsonify({'message': 'Senha redefinida com sucesso'}), 200
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token expirado'}), 400
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Token inválido'}), 400


# Endpoint para retornar o usuário autenticado via cookie HttpOnly
# Útil para clientes que não conseguem ler o cookie diretamente (JS) —
# o fetch com credentials:'same-origin' envia o cookie ao servidor.
@auth_routes.route('/auth/me', methods=['GET'])
def me_via_cookie():
    token = request.cookies.get('access_token')
    if not token:
        return jsonify({'error': 'Nenhum token encontrado'}), 401
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user = User.query.get(payload.get('user_id'))
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        return jsonify(user.to_dict()), 200
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token expirado'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Token inválido'}), 401