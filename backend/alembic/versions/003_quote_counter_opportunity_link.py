"""Add quote_global_seq, ciudad/BL to quotations, quotation_id to opportunities, categoria to products, seed stationary batteries

Revision ID: 003
Revises: 002
Create Date: 2026-04-11
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None

STATIONARY_PRODUCTS = [
    # (modelo_hoppecke, referencia_usa, voltaje, capacidad_ah, kwh, peso_kg, largo_mm, ancho_mm, altura_mm, precio_neto_eur, precio_neto_usd, tecnologia)
    ("Xgrid 2 OPzV 100",  "XG-2OPzV-100",  "2V", 100,  0.200,  14,  104, 210, 440, 260.00,  280.80,  "OPzV"),
    ("Xgrid 3 OPzV 150",  "XG-3OPzV-150",  "2V", 150,  0.300,  19,  104, 210, 440, 370.00,  399.60,  "OPzV"),
    ("Xgrid 4 OPzV 200",  "XG-4OPzV-200",  "2V", 200,  0.400,  25,  124, 210, 440, 490.00,  529.20,  "OPzV"),
    ("Xgrid 6 OPzV 300",  "XG-6OPzV-300",  "2V", 300,  0.600,  36,  145, 210, 440, 690.00,  745.20,  "OPzV"),
    ("Xgrid 8 OPzV 400",  "XG-8OPzV-400",  "2V", 400,  0.800,  47,  166, 210, 440, 890.00,  961.20,  "OPzV"),
    ("Xgrid 10 OPzV 500", "XG-10OPzV-500", "2V", 500,  1.000,  58,  187, 210, 440, 1090.00, 1177.20, "OPzV"),
    ("Xgrid 12 OPzV 600", "XG-12OPzV-600", "2V", 600,  1.200,  69,  208, 210, 440, 1280.00, 1382.40, "OPzV"),
    ("Xgrid 16 OPzV 800", "XG-16OPzV-800", "2V", 800,  1.600,  90,  208, 210, 628, 1660.00, 1792.80, "OPzV"),
    ("Xgrid 20 OPzV 1000","XG-20OPzV-1000","2V", 1000, 2.000, 112,  208, 210, 780, 2040.00, 2203.20, "OPzV"),
    ("Xgrid 24 OPzV 1200","XG-24OPzV-1200","2V", 1200, 2.400, 133,  208, 210, 930, 2390.00, 2581.20, "OPzV"),
    ("Xgrid 30 OPzV 1500","XG-30OPzV-1500","2V", 1500, 3.000, 165,  208, 210,1140, 2930.00, 3164.40, "OPzV"),
    ("Xgrid 40 OPzV 2000","XG-40OPzV-2000","2V", 2000, 4.000, 218,  208, 272,1140, 3800.00, 4104.00, "OPzV"),
    ("Xgrid 60 OPzV 3000","XG-60OPzV-3000","2V", 3000, 6.000, 325,  208, 400,1140, 5640.00, 6091.20, "OPzV"),
    # 12V monoblocs
    ("Xgrid 12V 100",     "XG-12V-100",    "12V", 100, 1.200,  30,  407, 176, 225, 580.00,  626.40,  "VRLA-AGM"),
    ("Xgrid 12V 150",     "XG-12V-150",    "12V", 150, 1.800,  44,  485, 172, 240, 840.00,  907.20,  "VRLA-AGM"),
    ("Xgrid 12V 200",     "XG-12V-200",    "12V", 200, 2.400,  59,  522, 238, 223, 1080.00, 1166.40, "VRLA-AGM"),
]


def upgrade() -> None:
    # 1 ── Global quote sequence (starts after existing quotations)
    op.execute("CREATE SEQUENCE IF NOT EXISTS quote_global_seq START 1 INCREMENT 1")

    # 2 ── Add ciudad_cotizacion & business_line_id to quotations
    op.add_column("quotations", sa.Column("ciudad_cotizacion", sa.String(50), server_default="med"))
    op.add_column(
        "quotations",
        sa.Column("business_line_id", sa.Integer(), sa.ForeignKey("business_lines.id"), nullable=True),
    )

    # 3 ── Add quotation_id (1:1) & numero_oportunidad to opportunities
    op.add_column(
        "opportunities",
        sa.Column("quotation_id", sa.Integer(), sa.ForeignKey("quotations.id"), nullable=True, unique=True),
    )
    op.add_column("opportunities", sa.Column("numero_oportunidad", sa.String(50)))

    # 4 ── Add categoria & tecnologia to products
    op.add_column("products", sa.Column("categoria", sa.String(50), server_default="traccion"))
    op.add_column("products", sa.Column("tecnologia", sa.String(50)))

    # 5 ── Seed HOPPECKE Xgrid Xtreme stationary batteries (business_line_id=2)
    conn = op.get_bind()
    for prod in STATIONARY_PRODUCTS:
        modelo, ref_usa, voltaje, ah, kwh, peso, largo, ancho, alto, eur, usd, tec = prod
        conn.execute(
            text("""
                INSERT INTO products
                    (business_line_id, voltaje, referencia_usa, tipo_conector, modelo_hoppecke,
                     capacidad_ah, kwh, peso_kg, largo_mm, ancho_mm, altura_mm,
                     precio_neto_eur, precio_neto_usd, activo, categoria, tecnologia)
                VALUES
                    (2, :voltaje, :ref_usa, NULL, :modelo,
                     :ah, :kwh, :peso, :largo, :ancho, :alto,
                     :eur, :usd, true, 'estacionaria', :tec)
            """),
            {
                "voltaje": voltaje, "ref_usa": ref_usa, "modelo": modelo,
                "ah": ah, "kwh": kwh, "peso": peso,
                "largo": largo, "ancho": ancho, "alto": alto,
                "eur": eur, "usd": usd, "tec": tec,
            },
        )

    # 6 ── Advance sequence past existing quotation count
    conn.execute(text("SELECT setval('quote_global_seq', GREATEST((SELECT COUNT(*) FROM quotations), 1))"))


def downgrade() -> None:
    op.drop_column("opportunities", "numero_oportunidad")
    op.drop_column("opportunities", "quotation_id")
    op.drop_column("quotations", "business_line_id")
    op.drop_column("quotations", "ciudad_cotizacion")
    op.drop_column("products", "categoria")
    op.drop_column("products", "tecnologia")
    op.execute("DROP SEQUENCE IF EXISTS quote_global_seq")
