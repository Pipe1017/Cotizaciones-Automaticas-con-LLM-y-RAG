"""Pipeline Go/Get probability + tabla proveedores + campos productos

Revision ID: 011
Revises: 010
Create Date: 2026-05-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # ── 1. Opportunities: prob_go + prob_get ──────────────────────
    op.add_column("opportunities", sa.Column("prob_go",  sa.Integer(), nullable=False, server_default="50"))
    op.add_column("opportunities", sa.Column("prob_get", sa.Integer(), nullable=False, server_default="50"))
    # Dejar probabilidad nullable (deprecada)
    op.alter_column("opportunities", "probabilidad", existing_type=sa.String(30), nullable=True)

    # Migrar etapas viejas → nuevas
    conn.execute(text("""
        UPDATE opportunities SET etapa = 'In Progress'
        WHERE etapa IN ('Must Win', 'Plan Foco', 'Cotizacion')
    """))
    conn.execute(text("""
        UPDATE opportunities SET etapa = 'Won'
        WHERE etapa IN ('OC', 'Facturacion')
    """))

    # ── 2. Tabla proveedores ──────────────────────────────────────
    op.create_table(
        "proveedores",
        sa.Column("id",               sa.Integer(),     primary_key=True),
        sa.Column("nombre",           sa.String(200),   nullable=False, index=True),
        sa.Column("pais",             sa.String(60),    server_default="Colombia"),
        sa.Column("sitio_web",        sa.String(200)),
        sa.Column("contacto_nombre",  sa.String(100)),
        sa.Column("contacto_email",   sa.String(200)),
        sa.Column("notas",            sa.Text()),
        sa.Column("activo",           sa.Boolean(),     server_default="true"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )

    # Insertar HOPPECKE como proveedor inicial
    conn.execute(text(
        "INSERT INTO proveedores (nombre, pais, sitio_web) "
        "VALUES ('HOPPECKE', 'Alemania', 'https://www.hoppecke.com')"
    ))

    # ── 3. Productos: proveedor_id + updated_at + datasheet_path ──
    op.add_column("products", sa.Column(
        "proveedor_id", sa.Integer(),
        sa.ForeignKey("proveedores.id", ondelete="SET NULL"), nullable=True,
    ))
    op.add_column("products", sa.Column("datasheet_path", sa.Text(), nullable=True))
    op.add_column("products", sa.Column(
        "updated_at", sa.TIMESTAMP(timezone=True),
        server_default=sa.func.now(),
    ))

    # Vincular todos los productos existentes a HOPPECKE
    conn.execute(text(
        "UPDATE products SET proveedor_id = (SELECT id FROM proveedores WHERE nombre = 'HOPPECKE')"
    ))


def downgrade():
    op.drop_column("products", "updated_at")
    op.drop_column("products", "datasheet_path")
    op.drop_column("products", "proveedor_id")
    op.drop_table("proveedores")
    op.drop_column("opportunities", "prob_get")
    op.drop_column("opportunities", "prob_go")
