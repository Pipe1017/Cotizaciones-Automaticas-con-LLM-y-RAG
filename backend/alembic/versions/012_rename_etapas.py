"""Simplificar etapas de oportunidades a español

Revision ID: 012
Revises: 011
Create Date: 2026-05-07
"""
from alembic import op
from sqlalchemy import text

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("UPDATE opportunities SET etapa='En Proceso' WHERE etapa='In Progress'"))
    conn.execute(text("UPDATE opportunities SET etapa='Ganada'     WHERE etapa='Won'"))
    conn.execute(text("UPDATE opportunities SET etapa='Perdida'    WHERE etapa IN ('Lost','No Bid')"))
    conn.execute(text("UPDATE opportunities SET etapa='Cancelada por Cliente' WHERE etapa='Cancelled by Client'"))


def downgrade():
    conn = op.get_bind()
    conn.execute(text("UPDATE opportunities SET etapa='In Progress'          WHERE etapa='En Proceso'"))
    conn.execute(text("UPDATE opportunities SET etapa='Won'                  WHERE etapa='Ganada'"))
    conn.execute(text("UPDATE opportunities SET etapa='Lost'                 WHERE etapa='Perdida'"))
    conn.execute(text("UPDATE opportunities SET etapa='Cancelled by Client'  WHERE etapa='Cancelada por Cliente'"))
