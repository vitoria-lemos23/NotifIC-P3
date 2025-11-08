# routes/auth.py

import jwt
from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta, timezone
from models.userModel import User
from app import db, mail
from flask_mail import Message

auth_routes = Blueprint('auth_routes', __name__)

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
    return jsonify({'token': token})

@auth_routes.route('/recuperar-senha', methods=['POST'])
def recuperar_senha():
    data = request.get_json()
    email = data.get('email')
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
    msg = Message(
        subject='Recuperação de senha',
        sender=current_app.config['MAIL_USERNAME'],
        recipients=[email],
        body=f'Use este link para redefinir sua senha: http://localhost:5000/redefinir-senha?token={token}'
    )
    mail.send(msg)
    return jsonify({'message': 'E-mail de recuperação enviado'}), 200

@auth_routes.route('/redefinir-senha', methods=['POST'])
def redefinir_senha():
    data = request.get_json()
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