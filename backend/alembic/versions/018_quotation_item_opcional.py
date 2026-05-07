"""Add opcional field to quotation_items

Revision ID: 018
Revises: 017
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

revision = '018'
down_revision = '017'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('quotation_items',
        sa.Column('opcional', sa.Boolean(), nullable=False, server_default='false')
    )


def downgrade():
    op.drop_column('quotation_items', 'opcional')
