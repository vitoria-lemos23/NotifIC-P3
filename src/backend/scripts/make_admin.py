#!/usr/bin/env python3
"""Promove um usuário existente para o papel ADMIN (ou outro papel válido).

Uso:
  - Rode a partir da pasta `src/backend` com venv ativado:
      python scripts/make_admin.py --email seu.email@exemplo.com

  - Para apontar a outro banco (opcional):
      python scripts/make_admin.py --email seu.email@exemplo.com --db-url "postgres://user:pass@host:5432/dbname"

O script usa a factory `create_app()` para ter o mesmo contexto/enum do app.
"""
import os
import argparse
import sys

try:
    # importa a factory do app e o db da aplicação
    from app import create_app, db
    from models.userModel import User, RoleEnum
except Exception as e:
    print("Erro ao importar dependências do app. Execute o script a partir de `src/backend` com o venv ativado.")
    print(str(e))
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Promove um usuário para ADMIN usando o contexto do Flask app')
    parser.add_argument('--email', '-e', required=True, help='Email do usuário a promover')
    parser.add_argument('--role', '-r', default='ADMIN', help='Role a aplicar (default: ADMIN)')
    parser.add_argument('--db-url', help='Opcional: DATABASE_URL para sobrescrever a conexão')
    args = parser.parse_args()

    if args.db_url:
        os.environ['DATABASE_URL'] = args.db_url

    app = create_app()
    with app.app_context():
        user = User.query.filter_by(email=args.email).first()
        if not user:
            print(f"Usuário não encontrado: {args.email}")
            return

        try:
            selected_role = RoleEnum[args.role]
        except KeyError:
            valid = ', '.join([r.name for r in RoleEnum])
            print(f"Role inválida: {args.role}. Valores válidos: {valid}")
            return

        old = user.role.name if user.role else None
        user.role = selected_role
        try:
            db.session.commit()
            print(f"Promovido: {user.email} ({user.id}) {old} -> {user.role.name}")
        except Exception as e:
            db.session.rollback()
            print("Falha ao gravar no banco:", str(e))


if __name__ == '__main__':
    main()
