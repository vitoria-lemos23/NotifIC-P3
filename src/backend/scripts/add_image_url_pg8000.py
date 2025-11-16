#!/usr/bin/env python3
"""
Simple script to add `image_url` column to `news` table using pg8000 (pure-Python Postgres driver).

Usage:
  # install dependency (only needed locally)
  python -m pip install pg8000

  # run (provide DATABASE_URL via env or as first arg)
  export DATABASE_URL="postgresql://user:pass@host:port/dbname"
  python src/backend/scripts/add_image_url_pg8000.py

Or:
  python src/backend/scripts/add_image_url_pg8000.py "postgresql://..."

This script is safe to run multiple times; it uses IF NOT EXISTS.
"""
import os
import sys


def get_db_url():
    if len(sys.argv) > 1:
        return sys.argv[1]
    env = os.environ.get('DATABASE_URL') or os.environ.get('DB_URL')
    if env:
        return env
    # fallback to common env name used earlier
    env2 = os.environ.get('PGDATABASE_URL')
    if env2:
        return env2
    print('ERROR: provide DATABASE_URL as env var or first argument')
    sys.exit(2)


def main():
    url = get_db_url()
    try:
        import pg8000
    except Exception:
        print('pg8000 not installed. Install with: python -m pip install pg8000')
        sys.exit(1)

    # pg8000 expects a connection dict or URL; use pg8000.dbapi.connect via URL parsing
    try:
        # simple URL parsing
        from urllib.parse import urlparse
        p = urlparse(url)
        if p.scheme not in ('postgresql', 'postgres'):
            raise ValueError('Invalid scheme in DB URL')
        user = p.username
        password = p.password
        host = p.hostname or 'localhost'
        port = p.port or 5432
        dbname = p.path.lstrip('/')

        conn = pg8000.connect(user=user, password=password, host=host, port=port, database=dbname)
        cur = conn.cursor()
        cur.execute("ALTER TABLE news ADD COLUMN IF NOT EXISTS image_url VARCHAR(1024);")
        conn.commit()
        cur.close()
        conn.close()
        print('ALTER TABLE executed successfully')
    except Exception as e:
        print('Error executing ALTER TABLE:')
        import traceback; traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
