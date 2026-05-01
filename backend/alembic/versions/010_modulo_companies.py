"""Agregar campo modulo a companies

Revision ID: 010
Revises: 009
Create Date: 2026-05-01
"""
from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None

# Valores: energia_backup | agro_proyectos | h2_renovables | varios
MODULOS = ("energia_backup", "agro_proyectos", "h2_renovables", "varios")


def upgrade():
    op.add_column(
        "companies",
        sa.Column("modulo", sa.String(30), nullable=False, server_default="energia_backup"),
    )
    op.create_index("ix_companies_modulo", "companies", ["modulo"])


def downgrade():
    op.drop_index("ix_companies_modulo", table_name="companies")
    op.drop_column("companies", "modulo")
