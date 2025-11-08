# services/notification_service.py

from models.userModel import User, NotificationPreferenceEnum
from models.newsModel import News, TagEnum
from models.notificationModel import Notification, UserNotification
from app import db

# Função para criar e enviar notificações para usuários com preferência correspondente à tag da notícia

def notify_users_for_news(news: News):
    if not news.tags:
        return
    # Para cada tag da notícia, buscar usuários que têm essa preferência
    for tag in news.tags:
        users = User.query.filter(User.notification_preferences.any(tag)).all()
        for user in users:
            # Criar notificação
            message = f'Nova notícia: {news.title} ({tag.value})'
            notification = Notification(news_id=news.id, message=message)
            db.session.add(notification)
            db.session.flush()  # Para obter o id da notificação
            # Relacionar notificação ao usuário
            user_notification = UserNotification(user_id=user.id, notification_id=notification.id)
            db.session.add(user_notification)
                # Enviar email
            from services.email_service import send_email
            send_email(user.email, 'Nova Notificação', message)
    db.session.commit()

# Função para buscar últimas 10 notificações e contar não visualizadas

def get_user_notifications(user_id: int):
    notifications = UserNotification.query.filter_by(user_id=user_id).order_by(UserNotification.sent_at.desc()).limit(10).all()
    unread_count = UserNotification.query.filter_by(user_id=user_id, viewed=False).count()
    return notifications, unread_count
