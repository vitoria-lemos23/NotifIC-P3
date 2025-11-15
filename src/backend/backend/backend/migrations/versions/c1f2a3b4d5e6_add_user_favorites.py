"""add user_favorites association table

Revision ID: c1f2a3b4d5e6
Revises: 7e7a6983f318
Create Date: 2025-11-11 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c1f2a3b4d5e6'
down_revision = '7e7a6983f318'
branch_labels = None
depends_on = None


def upgrade():
    # Create the association table between users and news for favorites
    op.create_table(
        'user_favorites',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('news_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['news_id'], ['news.id'], ),
        sa.PrimaryKeyConstraint('user_id', 'news_id')
    )


def downgrade():
    op.drop_table('user_favorites')
