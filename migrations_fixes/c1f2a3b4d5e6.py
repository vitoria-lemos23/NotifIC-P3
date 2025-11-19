"""empty revision to satisfy alembic version table

Revision ID: c1f2a3b4d5e6
Revises: 
Create Date: 2025-11-19 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c1f2a3b4d5e6'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # this is a no-op placeholder to satisfy alembic when DB references this revision
    pass


def downgrade():
    pass
