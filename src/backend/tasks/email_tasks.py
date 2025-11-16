from app import create_app, mail
from flask_mail import Message
from flask import current_app


def send_recovery_email(token: str, recipient: str):
    """Send password recovery email inside a standalone worker process.

    This function is intended to be enqueued by RQ. It creates a fresh
    application context so Flask-Mail can access the app config.
    """
    app = create_app()
    with app.app_context():
        try:
            base_url = current_app.config.get('FRONTEND_URL') or current_app.config.get('SERVER_NAME') or ''
            reset_link = f"{base_url}/redefinir-senha?token={token}" if base_url else f"/redefinir-senha?token={token}"
            msg = Message(
                subject='Recuperação de senha',
                sender=current_app.config.get('MAIL_USERNAME'),
                recipients=[recipient],
                body=f'Use este link para redefinir sua senha: {reset_link}'
            )
            mail.send(msg)
        except Exception:
            # Let the worker log the exception; re-raise so RQ records a failure
            current_app.logger.exception('Falha ao enviar e-mail de recuperação (worker)')
            raise
