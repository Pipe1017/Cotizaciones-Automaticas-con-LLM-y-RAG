"""Agregar campo notas a quotation_items para validación de catálogo

Revision ID: 014
Revises: 013
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("quotation_items", sa.Column("notas", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("quotation_items", "notas")
