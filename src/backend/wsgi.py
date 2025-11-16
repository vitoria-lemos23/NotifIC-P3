import os
from pathlib import Path

from app import create_app

# Optional: run migrations at startup when FORCE_MIGRATE=1 is set in the environment.
# This is a temporary convenience for environments where you cannot run one-off
# commands (e.g. restricted hosting). Set `FORCE_MIGRATE=1` in the service's
# environment, deploy, wait for migrations to apply, then unset the variable.
if os.environ.get("FORCE_MIGRATE") == "1":
	try:
		from alembic.config import Config
		from alembic import command

		base = Path(__file__).resolve().parent
		alembic_ini = base / "migrations" / "alembic.ini"
		if alembic_ini.exists():
			cfg = Config(str(alembic_ini))
			# Ensure script location is correct relative to current file
			cfg.set_main_option("script_location", str(base / "migrations"))
			command.upgrade(cfg, "head")
	except Exception:
		# Don't fail import if migrations fail; they will appear in logs.
		import traceback

		traceback.print_exc()

app = create_app()
