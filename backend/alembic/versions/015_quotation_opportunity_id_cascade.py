"""Change quotations.opportunity_id FK to CASCADE DELETE

Revision ID: 015
Revises: 014
Create Date: 2026-05-07
"""
from alembic import op

revision = '015'
down_revision = '014'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint('quotations_opportunity_id_fkey', 'quotations', type_='foreignkey')
    op.create_foreign_key(
        'quotations_opportunity_id_fkey',
        'quotations', 'opportunities',
        ['opportunity_id'], ['id'],
        ondelete='CASCADE',
    )


def downgrade():
    op.drop_constraint('quotations_opportunity_id_fkey', 'quotations', type_='foreignkey')
    op.create_foreign_key(
        'quotations_opportunity_id_fkey',
        'quotations', 'opportunities',
        ['opportunity_id'], ['id'],
    )
