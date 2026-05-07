"""Add business_line_ids (multi-BL) to opportunities

Revision ID: 016
Revises: 015
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('opportunities',
        sa.Column('business_line_ids', sa.Text(), nullable=True)
    )


def downgrade():
    op.drop_column('opportunities', 'business_line_ids')
