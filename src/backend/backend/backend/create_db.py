"""
Script destrutivo para DROPAR e RECRIAR o banco PostgreSQL a partir da
migração inicial (Alembic). Use com cuidado — faça backup se necessário.

Como usar (PowerShell, no root do repo):
& .\.venv\Scripts\Activate.ps1
python src/backend/reset_db.py

O script:
- lê src/backend/.env para obter DB_USER/DB_PASSWORD/DB_HOST/DB_PORT/DB_NAME
- conecta ao postgres (db "postgres") e executa DROP DATABASE IF EXISTS / CREATE DATABASE
- executa alembic upgrade head usando migrations/alembic.ini (substitui sqlalchemy.url)
"""
import os
import sys
import traceback
from urllib.parse import urlparse

try:
    import psycopg2
except Exception as e:
    print("Erro: psycopg2 não encontrado. Instale em seu venv: pip install psycopg2-binary")
    sys.exit(1)

try:
    from alembic.config import Config
    from alembic import command
except Exception:
    print("Erro: alembic não encontrado. Instale em seu venv: pip install alembic")
    sys.exit(1)


def load_env(env_path):
    """Carrega variáveis simples do .env (KEY=VALUE)."""
    env = {}
    if not os.path.exists(env_path):
        raise FileNotFoundError(f".env não encontrado em: {env_path}")
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' not in line:
                continue
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def parse_database_url(database_url: str):
    """Parse a SQLAlchemy/Postgres DATABASE_URL into components.
    Returns (user, password, host, port, dbname)
    """
    if not database_url:
        return None
    parsed = urlparse(database_url)
    # parsed.path may be like '/dbname'
    dbname = parsed.path.lstrip('/') if parsed.path else None
    user = parsed.username
    password = parsed.password
    host = parsed.hostname or 'localhost'
    port = parsed.port or '5432'
    return user, password, host, port, dbname


def drop_and_create_db(user, password, host, port, dbname):
    """Conecta ao DB 'postgres' e dropa/cria o banco alvo."""
    print(f'Conectando ao servidor Postgres em {host}:{port} como {user}...')
    conn = psycopg2.connect(dbname='postgres', user=user, password=password, host=host, port=port)
    conn.autocommit = True
    cur = conn.cursor()
    try:
        print(f'Dropping database "{dbname}" (se existir)...')
        # Terminate other backends connected to the target database so DROP can proceed
        try:
            terminate_sql = ("SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                             "WHERE datname = %s AND pid <> pg_backend_pid();")
            cur.execute(terminate_sql, (dbname,))
            terminated = cur.rowcount
            if terminated:
                print(f'Terminadas {terminated} sessões conectadas ao banco "{dbname}".')
        except Exception as e:
            # não fatal — apenas informa
            print('Aviso: falha ao terminar sessões ativas antes do DROP:', e)

        cur.execute(f'DROP DATABASE IF EXISTS "{dbname}";')
        print(f'Criando database "{dbname}"...')
        cur.execute(f'CREATE DATABASE "{dbname}";')
        print('Operação DROP/CREATE concluída.')
    finally:
        cur.close()
        conn.close()


def run_alembic_upgrade(migrations_ini_path, database_url):
    """Roda alembic upgrade head apontando para a URL do DB."""
    print('Aplicando migrations (alembic upgrade head)...')
    cfg = Config(migrations_ini_path)
    # garante que usamos a URL correta (sobrescreve a do ini, se houver)
    cfg.set_main_option('sqlalchemy.url', database_url)
    # garante que o alembic saiba onde estão os scripts (usa caminho absoluto)
    migrations_dir = os.path.dirname(migrations_ini_path)
    cfg.set_main_option('script_location', migrations_dir)
    command.upgrade(cfg, 'head')
    print('Migrations aplicadas com sucesso.')


def ensure_user_favorites_table(database_url):
    """Garante que a tabela user_favorites exista (cria se necessário).

    Isso é um passo idempotente e serve como fallback caso as migrations
    não tenham sido aplicadas corretamente.
    """
    print('Verificando existência da tabela user_favorites...')
    try:
        conn = psycopg2.connect(database_url)
        conn.autocommit = True
        cur = conn.cursor()
        create_sql = '''
        CREATE TABLE IF NOT EXISTS user_favorites (
            user_id INTEGER NOT NULL,
            news_id INTEGER NOT NULL,
            PRIMARY KEY (user_id, news_id),
            CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            CONSTRAINT fk_news FOREIGN KEY (news_id) REFERENCES news (id) ON DELETE CASCADE
        );
        '''
        cur.execute(create_sql)
        cur.close()
        conn.close()
        print('Tabela user_favorites verificada/criada com sucesso.')
    except Exception as e:
        print('Aviso: falha ao garantir tabela user_favorites:', e)
        # não interrompe o script porque as migrations já foram aplicadas (se funcionaram)


def ensure_admin_user(database_url, username='notific', email='Notificufal@gmail.com', password='notific'):
    """Garante que exista um usuário administrador inicial.

    Insere um usuário com id=1, username/email/pw fornecidos e role 'ADMIN'
    caso não exista. Ajusta a sequência do id de users após inserção.
    """
    try:
        from werkzeug.security import generate_password_hash
    except Exception:
        raise RuntimeError('werkzeug is required to hash the admin password')

    print('Verificando existência do usuário administrador...')
    conn = None
    try:
        conn = psycopg2.connect(database_url)
        conn.autocommit = True
        cur = conn.cursor()

        # Verifica se já existe usuário com id=1 ou mesmo username/email
        cur.execute('SELECT id FROM users WHERE id = 1 OR username = %s OR email = %s;', (username, email))
        row = cur.fetchone()
        if row:
            print('Usuário administrador já existe (ou id 1 ocupado). Pulando criação.')
            cur.close()
            conn.close()
            return

        pw_hash = generate_password_hash(password)

        insert_sql = '''
        INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, now(), now());
        '''
        cur.execute(insert_sql, (1, username, email, pw_hash, 'ADMIN'))

        # Atualiza sequência do serial para evitar conflitos futuros
        try:
            cur.execute("SELECT setval(pg_get_serial_sequence('users','id'), (SELECT COALESCE(MAX(id), 1) FROM users));")
        except Exception:
            # não fatal
            pass

        cur.close()
        conn.close()
        print('Usuário administrador criado com sucesso (username="%s").' % username)
    except Exception as e:
        if conn:
            try:
                conn.close()
            except Exception:
                pass
        raise


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))  # src/backend
    import argparse
    parser = argparse.ArgumentParser(description='Drop and recreate the database using migrations')
    parser.add_argument('--database-url', dest='database_url', help='Full DATABASE_URL (postgresql://user:pass@host:port/dbname)')
    parser.add_argument('--yes', dest='yes', action='store_true', help='Skip interactive confirmation')
    args = parser.parse_args()

    # Determine DATABASE_URL: CLI > env var > .env file (backend) > repo root .env
    database_url = args.database_url or os.environ.get('DATABASE_URL')
    env = {}
    if not database_url:
        # try backend .env then repo root .env
        env_path = os.path.join(base_dir, '.env')
        alt_env_path = os.path.abspath(os.path.join(base_dir, '..', '..', '.env'))
        if os.path.exists(env_path):
            try:
                env = load_env(env_path)
            except Exception as e:
                print('Aviso: falha ao ler .env em src/backend:', e)
        elif os.path.exists(alt_env_path):
            try:
                env = load_env(alt_env_path)
            except Exception as e:
                print('Aviso: falha ao ler .env no repo root:', e)

    if not database_url:
        DB_USER = env.get('DB_USER') or env.get('POSTGRES_USER')
        DB_PASSWORD = env.get('DB_PASSWORD') or env.get('POSTGRES_PASSWORD')
        DB_HOST = env.get('DB_HOST', 'localhost')
        DB_PORT = env.get('DB_PORT', '5432')
        DB_NAME = env.get('DB_NAME') or env.get('POSTGRES_DB')

        if not all([DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME]):
            print('Variáveis DB_* faltando. Forneça um DATABASE_URL ou um .env com DB_USER/DB_PASSWORD/DB_HOST/DB_PORT/DB_NAME.')
            sys.exit(1)

        database_url = f'postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    else:
        # parse to components for drop/create
        parsed = parse_database_url(database_url)
        if not parsed:
            print('DATABASE_URL mal formada. Certifique-se de usar o formato postgresql://user:pass@host:port/dbname')
            sys.exit(1)
        DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME = parsed

    # Confirm destructive action unless --yes
    if not args.yes:
        prompt = input(f"Este script irá DROP/CREATE o banco '{DB_NAME}' em {DB_HOST}:{DB_PORT}. Continuar? (yes/no) [no]: ")
        if prompt.strip().lower() != 'yes':
            print('Operação cancelada pelo usuário.')
            sys.exit(0)

    try:
        drop_and_create_db(DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME)
    except Exception:
        print('Erro ao dropar/criar o banco:')
        traceback.print_exc()
        sys.exit(1)

    migrations_ini = os.path.join(base_dir, 'migrations', 'alembic.ini')
    if not os.path.exists(migrations_ini):
        print(f'Arquivo alembic.ini não encontrado em {migrations_ini}. Verifique sua pasta migrations.')
        sys.exit(1)

    try:
        run_alembic_upgrade(migrations_ini, database_url)
    except Exception:
        print('Erro ao aplicar migrations:')
        traceback.print_exc()
        sys.exit(1)

    # Garantir tabela de favoritos como passo adicional/fallback
    try:
        ensure_user_favorites_table(database_url)
    except Exception:
        print('Aviso: falha ao garantir tabela user_favorites (continuando)...')

    # Garantir usuário administrador inicial (id=1, username notific)
    try:
        ensure_admin_user(database_url)
    except Exception as e:
        print('Aviso: falha ao garantir usuário admin:', e)

    print('Banco recriado e migrations aplicadas. Pronto.')


if __name__ == '__main__':
    main()