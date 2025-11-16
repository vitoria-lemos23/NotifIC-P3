"""add image_url to news

Revision ID: d2f3e4b5c6a7
Revises: c1f2a3b4d5e6
Create Date: 2025-11-16 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd2f3e4b5c6a7'
down_revision = 'c1f2a3b4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    # Add image_url column to news
    op.add_column('news', sa.Column('image_url', sa.String(length=1024), nullable=True))


def downgrade():
    # Remove image_url column
    op.drop_column('news', 'image_url')

