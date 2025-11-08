# routes/user.py
from flask import Blueprint, request, jsonify
from models.userModel import User, RoleEnum
from app import db
from routes.decorators import token_required, role_required

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
    role = data.get('role')
    if role:
        user.role = role
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