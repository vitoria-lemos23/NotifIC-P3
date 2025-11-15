#!/usr/bin/env python
"""Simple management script to run migrations and seed the database.

Usage (from `src/backend`):
  python manage.py migrate
  python manage.py seed
  python manage.py migrate-and-seed

This is a convenience wrapper that calls Alembic and the seed script.
"""
import sys
import subprocess
from pathlib import Path

BASE = Path(__file__).resolve().parent


def run_alembic():
    cmd = [sys.executable, '-m', 'alembic', '-c', str(BASE / 'migrations' / 'alembic.ini'), 'upgrade', 'head']
    print('Running:', ' '.join(cmd))
    subprocess.check_call(cmd)


def run_seed():
    cmd = [sys.executable, str(BASE / 'scripts' / 'seed_notices.py')]
    print('Running:', ' '.join(cmd))
    subprocess.check_call(cmd)


def main():
    if len(sys.argv) < 2:
        print('Usage: python manage.py [migrate|seed|migrate-and-seed|run]')
        sys.exit(1)

    action = sys.argv[1]
    if action == 'migrate':
        run_alembic()
    elif action == 'seed':
        run_seed()
    elif action == 'migrate-and-seed':
        run_alembic()
        run_seed()
    else:
        print('Unknown action:', action)
        sys.exit(2)


if __name__ == '__main__':
    main()
