"""Trazabilidad IA: guardar prompt y reasoning en cotizaciones generadas por IA

Revision ID: 013
Revises: 012
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("quotations", sa.Column("ai_prompt",    sa.Text(), nullable=True))
    op.add_column("quotations", sa.Column("ai_reasoning", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("quotations", "ai_reasoning")
    op.drop_column("quotations", "ai_prompt")
