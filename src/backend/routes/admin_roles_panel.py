# admin_roles_panel.py (ATUALIZADO)

from flask import Blueprint, jsonify, render_template, request, current_app
import jwt
from routes.decorators import token_required, role_required
from app import db
# Importe o Modelo e o Enum do seu arquivo
from models.userModel import User, RoleEnum 

admin_roles_panel = Blueprint('admin_roles_panel', __name__)

# --- ROTA PARA RENDERIZAR A PÁGINA HTML ---
@admin_roles_panel.route('/admin/roles/view', methods=['GET'])
@role_required('ADMIN')
@token_required
def admin_roles_view():
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
    return render_template('admin_roles.html', usuario=usuario)


# --- ROTAS DA API (QUE O JAVASCRIPT VAI CHAMAR) ---

@admin_roles_panel.route('/admin/api/pedidos', methods=['GET'])
@role_required('ADMIN')
@token_required
def get_pedidos_moderador():
    """ (ROTA 2/6) Retorna usuários com o role PENDENTE_MOD. """
    try:
        # Agora usa o Enum oficial
        users = User.query.filter(User.role == RoleEnum.PENDENTE_MOD).all()
        return jsonify([user.to_dict() for user in users]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_roles_panel.route('/admin/api/moderadores', methods=['GET'])
@role_required('ADMIN')
@token_required
def get_moderadores_atuais():
    """ (ROTA 3/6) Retorna usuários com o role MODERADOR. """
    # Agora usa o Enum oficial
    users = User.query.filter(User.role == RoleEnum.MODERADOR).all()
    return jsonify([user.to_dict() for user in users]), 200


@admin_roles_panel.route('/admin/api/aceitar/<int:user_id>', methods=['POST'])
@role_required('ADMIN')
@token_required
def aceitar_moderador(user_id):
    """ (ROTA 4/6) Muda o role de PENDENTE_MOD para MODERADOR. """
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404

    # Agora usa o Enum oficial
    user.role = RoleEnum.MODERADOR
    db.session.commit()
    return jsonify({'message': f'Usuário {user.username} agora é Moderador.'}), 200


@admin_roles_panel.route('/admin/api/rejeitar/<int:user_id>', methods=['POST'])
@role_required('ADMIN')
@token_required
def rejeitar_moderador(user_id):
    """ (ROTA 5/6) Muda o role de PENDENTE_MOD de volta para USUARIO. """
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404

    # Agora usa o Enum oficial
    user.role = RoleEnum.USUARIO
    db.session.commit()
    return jsonify({'message': f'Pedido de {user.username} rejeitado.'}), 200


@admin_roles_panel.route('/admin/api/remover/<int:user_id>', methods=['POST'])
@role_required('ADMIN')
@token_required
def remover_moderador(user_id):
    """ (ROTA 6/6) Muda o role de MODERADOR de volta para USUARIO. """
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404

    # Agora usa o Enum oficial
    user.role = RoleEnum.USUARIO
    db.session.commit()
    return jsonify({'message': f'Moderador {user.username} removido.'}), 200