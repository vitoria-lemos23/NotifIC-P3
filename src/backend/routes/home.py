# routes/home.py

from flask import Blueprint, request, jsonify
from routes.decorators import token_required

home_routes = Blueprint('home_routes', __name__)

@home_routes.route('/', methods=['GET'])
def home():
    return "Olá, Notific-backend", 200

@home_routes.route('/status', methods=['GET'])
@token_required
def status():
    return jsonify({"status": "ok"}), 200