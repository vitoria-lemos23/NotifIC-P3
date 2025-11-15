# models/newsModel.py

from enum import Enum
from datetime import datetime, timezone
from app import db

# Associação many-to-many entre usuários e notícias para favoritos
user_favorites = db.Table(
    'user_favorites',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('news_id', db.Integer, db.ForeignKey('news.id'), primary_key=True)
)

class StatusEnum(Enum):
    ACEITA = 'ACEITA'
    PENDENTE = 'PENDENTE'
    REJEITADA = 'REJEITADA'

class TagEnum(Enum):
    PROJETO = 'PROJETO'
    EVENTO = 'EVENTO'
    VAGA = 'VAGA'

class News(db.Model):
    __tablename__ = 'news'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    hotNews = db.Column(db.Boolean, default=False)
    start_date = db.Column(db.DateTime, nullable=True)
    end_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.Enum(StatusEnum, name='status_enum'), default=StatusEnum.PENDENTE)
    tags = db.Column(db.ARRAY(db.Enum(TagEnum, name='tag_enum')), nullable=True)
    link = db.Column(db.String(200), nullable=True)
    # note: image paths handled by static JSON enrichment, not persisted on model

    author = db.relationship('User', backref=db.backref('news', lazy=True))

    # usuários que favoritaram esta notícia (backref cria User.favorite_news)
    favorited_by = db.relationship('User', secondary=user_favorites, backref=db.backref('favorite_news', lazy='dynamic'))

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'author_id': self.author_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'hotNews': self.hotNews,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status.value if self.status else None,
            'tags': [t.value for t in self.tags] if self.tags else [],
            'link': self.link
            ,
            # image fields removed from model; API may still enrich responses from static JSON
        }

    def __repr__(self) -> str:
        return f'<News {self.title}>'