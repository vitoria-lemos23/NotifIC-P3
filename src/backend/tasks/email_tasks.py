import os
from datetime import datetime as _dt
from flask import Flask
from flask_mail import Mail, Message
import requests
import json


def _build_minimal_mail_app():
    """Create a lightweight Flask app configured only for sending mail.

    This avoids importing the full application package (which may import
    DB drivers like psycopg on Windows). The worker only needs MAIL_*
    environment variables to send mail.
    """
    app = Flask(__name__)
    # Load mail config from environment variables; these are the ones used
    # by the main app's create_app.
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() in ('1', 'true', 'yes')
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    # Ensure a default sender is configured for Flask-Mail
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER') or app.config.get('MAIL_USERNAME')
    return app


def send_recovery_email(token: str, recipient: str):
    """Send password recovery email using a minimal app to avoid DB imports.

    This function is enqueued by RQ. It creates a small Flask app that only
    configures Flask-Mail from environment variables, so the worker process
    does not attempt to import DB drivers like psycopg on Windows.
    """
    app = _build_minimal_mail_app()
    mail = Mail(app)
    with app.app_context():
            # Prefer SendGrid API when SENDGRID_API_KEY is provided — it's easier
            # to configure for students and avoids SMTP complexity.
            sendgrid_key = os.getenv('SENDGRID_API_KEY')
            base_url = os.getenv('FRONTEND_URL') or os.getenv('SERVER_NAME') or ''
            reset_link = f"{base_url}/redefinir-senha?token={token}" if base_url else f"/redefinir-senha?token={token}"

            if sendgrid_key:
                try:
                    app.logger.info('Worker: sending recovery email via SendGrid for %s', recipient)
                    send_from = os.getenv('SENDGRID_FROM') or app.config.get('MAIL_DEFAULT_SENDER')
                    payload = {
                        'personalizations': [{'to': [{'email': recipient}]}],
                        'from': {'email': send_from},
                        'subject': 'Recuperação de senha',
                        'content': [{'type': 'text/plain', 'value': f'Use este link para redefinir sua senha: {reset_link}'}]
                    }
                    r = requests.post(
                        'https://api.sendgrid.com/v3/mail/send',
                        headers={
                            'Authorization': f'Bearer {sendgrid_key}',
                            'Content-Type': 'application/json'
                        },
                        data=json.dumps(payload),
                        timeout=10,
                    )
                    r.raise_for_status()
                    app.logger.info('Worker: SendGrid accepted the message for %s', recipient)
                    return
                except Exception:
                    app.logger.exception('SendGrid send failed; falling back to SMTP')

            try:
                app.logger.info('Worker: start send_recovery_email for %s', recipient)
                msg = Message(
                    subject='Recuperação de senha',
                    sender=app.config.get('MAIL_DEFAULT_SENDER'),
                    recipients=[recipient],
                    body=f'Use este link para redefinir sua senha: {reset_link}'
                )
                mail.send(msg)
                app.logger.info('Worker: successfully sent recovery email to %s', recipient)
            except Exception:
                app.logger.exception('Falha ao enviar e-mail de recuperação (worker)')
                # Development fallback: write the reset link to a local file so students
                # can continue testing without a real SMTP setup. Enable by setting
                # DEV_EMAIL_FALLBACK=1 in the environment (defaults to enabled).
                fallback = os.getenv('DEV_EMAIL_FALLBACK', '1').lower() in ('1', 'true', 'yes')
                if fallback:
                    try:
                        os.makedirs('tmp', exist_ok=True)
                        with open('tmp/sent_emails.log', 'a', encoding='utf-8') as fh:
                            fh.write(f"[{_dt.utcnow().isoformat()}] to={recipient} link={reset_link}\n")
                        app.logger.warning('Worker: wrote recovery link to tmp/sent_emails.log (fallback)')
                        print(f"DEV FALLBACK - recovery link for {recipient}: {reset_link}")
                        return
                    except Exception:
                        app.logger.exception('Worker: failed to write fallback email log')
                # If fallback not enabled or writing failed, propagate the exception
                raise
