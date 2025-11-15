# models/userModel.py

from enum import Enum
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from app import db


class RoleEnum(Enum):
    ADMIN = 'ADMIN'
    MODERADOR = 'MODERADOR'
    USUARIO= 'USUARIO'

class NotificationPreferenceEnum(Enum):
    EVENTO = 'EVENTO'
    VAGA = 'VAGA'
    PROJETO = 'PROJETO'
    TODOS = 'TODOS'

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.Enum(RoleEnum, name='role_enum'), nullable=False, default=RoleEnum.USUARIO)
    notification_preferences = db.Column(db.ARRAY(db.Enum(NotificationPreferenceEnum, name='notification_preference_enum')), nullable=True)
    profile_picture = db.Column(db.String(200), nullable=True)
    # Use callables for defaults so timestamps are evaluated at insert/update time
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def is_admin(self) -> bool:
        return self.role == RoleEnum.ADMIN

    def is_moderator(self) -> bool:
        # Enum member is defined as MODERADOR
        return self.role == RoleEnum.MODERADOR

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role.value if self.role else None,
            'notification_preferences': [pref.value for pref in self.notification_preferences] if self.notification_preferences else [],
            'profile_picture': self.profile_picture,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self) -> str:
        return f'<User {self.username}>'