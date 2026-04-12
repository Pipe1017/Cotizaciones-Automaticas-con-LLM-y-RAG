"""Landed/margen/fecha en oportunidades; asesor y rutas de archivos en cotizaciones

Revision ID: 006
Revises: 005
Create Date: 2026-04-12
"""

from alembic import op
from sqlalchemy import text

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # Opportunities: campos de costos internos + fecha
    conn.execute(text("""
        ALTER TABLE opportunities
        ADD COLUMN IF NOT EXISTS landed_pct   NUMERIC(6,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS margen_pct   NUMERIC(6,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS fecha_oportunidad DATE
    """))

    # Quotations: asesor + rutas de archivos word/pdf
    conn.execute(text("""
        ALTER TABLE quotations
        ADD COLUMN IF NOT EXISTS asesor              VARCHAR(100),
        ADD COLUMN IF NOT EXISTS file_path_carta     TEXT,
        ADD COLUMN IF NOT EXISTS file_path_cotizacion TEXT,
        ADD COLUMN IF NOT EXISTS file_path_pdf       TEXT
    """))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(text("""
        ALTER TABLE opportunities
        DROP COLUMN IF EXISTS landed_pct,
        DROP COLUMN IF EXISTS margen_pct,
        DROP COLUMN IF EXISTS fecha_oportunidad
    """))
    conn.execute(text("""
        ALTER TABLE quotations
        DROP COLUMN IF EXISTS asesor,
        DROP COLUMN IF EXISTS file_path_carta,
        DROP COLUMN IF EXISTS file_path_cotizacion,
        DROP COLUMN IF EXISTS file_path_pdf
    """))
