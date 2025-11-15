# routes/home.py

from flask import Blueprint, request, jsonify, render_template, current_app
import jwt
from models.userModel import User
from routes.decorators import token_required

home_routes = Blueprint('home_routes', __name__)


@home_routes.route('/', methods=['GET'])
def home():
    # Attempt to read server-side cookie and decode user for server-driven rendering
    usuario = None
    token = request.cookies.get('access_token')
    if token:
        try:
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            user = User.query.get(payload.get('user_id'))
            if user:
                usuario = user.to_dict()
        except jwt.ExpiredSignatureError:
            usuario = None
        except jwt.InvalidTokenError:
            usuario = None

    return render_template('home.html', usuario=usuario)


@home_routes.route('/status', methods=['GET'])
@token_required
def status():
    return jsonify({"status": "ok"}), 200