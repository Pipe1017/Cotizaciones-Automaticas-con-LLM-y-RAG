"""seed business lines, products, exchange rates

Revision ID: 002
Revises: 001
Create Date: 2026-04-11
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from decimal import Decimal

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


BUSINESS_LINES = [
    {"id": 1, "nombre": "TRACCION", "descripcion": "Baterías industriales HOPPECKE para montacargas y equipo de tracción"},
    {"id": 2, "nombre": "ESTACIONARIA", "descripcion": "Baterías de respaldo estacionario y sistemas UPS"},
    {"id": 3, "nombre": "DRIVES", "descripcion": "Variadores de frecuencia y arrancadores suaves AB/ABB"},
    {"id": 4, "nombre": "LOGISTICA", "descripcion": "Servicios logísticos y consumibles"},
    {"id": 5, "nombre": "QUIMICOS", "descripcion": "Fertilizantes y químicos para sector agrícola"},
    {"id": 6, "nombre": "PROYECTOS", "descripcion": "Licitaciones, proyectos especiales y nuevas tecnologías"},
]

# 35 products extracted from HOPPECKE catalog (HYSTER sheet)
# Columns: voltaje, referencia_usa, tipo_conector, modelo_hoppecke, codigo_sap,
#          tension_v, capacidad_ah, kwh, peso_kg, largo_mm, ancho_mm, altura_mm, codigo_cofre
HOPPECKE_PRODUCTS = [
    ("24V", "12-85-7",  "SB175 rojo", "24V 2 HPzS 230",       "2315473090", 24.0, 240.0,  5.760,  200.0, 610.0, 196.0, 610.0, "T54730"),
    ("24V", "12-85-7",  "SB175 rojo", "24V 2 HPzS 250",       "2015473090", 24.0, 261.0,  6.264,  208.0, 610.0, 196.0, 610.0, "T54730"),
    ("24V", "12-85-7",  "SB175 rojo", "24V 3 HPzB 225",       "2015473090", 24.0, 261.0,  6.264,  235.0, 645.0, 220.0, 597.0, "T54490"),
    ("24V", "12-85-13", "SB175 rojo", "24V 7 HPzB 525",       "2315337790", 24.0, 549.0, 13.176,  431.0, 780.0, 326.0, 585.0, "T53377"),
    ("24V", "12-85-13", "SB175 rojo", "24V 4 HPzS 500",       "2315337790", 24.0, 523.0, 12.552,  421.0, 780.0, 326.0, 627.0, "T53952"),
    ("24V", "12-125-13","SB175 rojo", "24V 7 HPzB 756",       "2315290490", 24.0, 786.0, 18.864,  583.0, 780.0, 328.0, 780.0, "T52904"),
    ("24V", "12-125-15","SB350 rojo", "24V 8 HPzB 864",       "2311892694", 24.0, 899.0, 21.576,  730.0, 920.0, 355.0, 775.0, "T18926"),
    ("24V", "12-125-15","SB350 rojo", "24V 5 HPzS 775",       "2311892694", 24.0, 810.0, 19.440,  730.0, 920.0, 355.0, 775.0, "T18926"),
    ("24V", "12-125-17","SB350 rojo", "24V 6 HPzS 930",       "2015379991", 24.0, 972.0, 23.328,  761.0, 968.0, 341.0, 775.0, "T53799"),
    ("36V", "18-85-13", "SB350 gris", "36V 7 HPzB 525",       "2315322191", 36.0, 549.0, 19.764,  638.0, 967.0, 387.0, 575.0, "T51822"),
    ("36V", "18-85-17", "SB350 gris", "36V 6 HPzS 690 (A)",   "2315322191", 36.0, 720.0, 25.920,  776.0, 982.0, 528.0, 575.0, "T53221"),
    ("36V", "18-85-17", "SB350 gris", "36V 6 HPzS 690 (B)",   "2315322191", 36.0, 720.0, 25.920,  776.0, 750.0, 615.0, 587.0, "T54727"),
    ("36V", "18-85-19", "SB350 gris", "36V 7 HPzS 805 (A)",   "2315472890", 36.0, 841.0, 30.276,  885.0, 840.0, 612.0, 585.0, "T54728"),
    ("36V", "18-85-19", "SB350 gris", "36V 7 HPzS 805 (B)",   "2315472890", 36.0, 841.0, 30.276,  885.0, 985.0, 660.0, 585.0, "T54732"),
    ("36V", "18-85-19", "SB350 gris", "36V 7 HPzS 805 (C)",   "2315472990", 36.0, 841.0, 30.276,  890.0, 970.0, 590.0, 590.0, "T54729"),
    ("36V", "18-85-21", "SB350 gris", "36V 8 HPzS 840",       "2015469090", 36.0, 878.0, 31.608, 1061.0, 982.0, 635.0, 580.0, "T53870"),
    ("36V", "18-85-23", "SB350 gris", "36V 8 HPzS 920",       "2315469090", 36.0, 961.0, 34.596, 1034.0, 970.0, 620.0, 580.0, "T54690"),
    ("36V", "18-85-25", "SB350 gris", "36V 10 HPzS 1050 (A)", "2015382390", 36.0, 1097.0, 39.492, 1323.0, 977.0, 810.0, 560.0, "T53823"),
    ("36V", "18-85-25", "SB350 gris", "36V 7 HPzB 525 II",    "2315473190", 36.0, 1098.0, 39.528, 1220.0, 970.0, 767.0, 570.0, "T54731"),
    ("36V", "18-85-27", "SB350 gris", "36V 10 HPzS 1050 (B)", "2015382390", 36.0, 1097.0, 39.492, 1323.0, 977.0, 810.0, 560.0, "T53823"),
    ("36V", "18-85-29", "SB350 gris", "36V 10 HPzS 1050 (C)", "2015382390", 36.0, 1097.0, 39.492, 1323.0, 977.0, 810.0, 560.0, "T53823"),
    ("36V", "18-125-11","SB350 gris", "36V 4 HPzS 620",       "2011917790", 36.0, 645.0, 23.220,  775.0, 974.0, 343.0, 784.0, "T54044"),
    ("36V", "18-125-13","SB350 gris", "36V 5 HPzS 775",       "2015335090", 36.0, 810.0, 29.160,  864.0, 960.0, 408.0, 775.0, "T53350"),
    ("36V", "18-125-15","SB350 gris", "36V 8 HPzB 864",       "2315383990", 36.0, 903.0, 32.508, 1089.0, 970.0, 450.0, 775.0, "T53839"),
    ("36V", "18-125-17","SB350 gris", "36V 6 HPzS 930",       "2015313790", 36.0, 972.0, 34.992, 1233.0, 970.0, 510.0, 775.0, "T53137"),
    ("48V", "24-85-13", "SB350 azul", "48V 7 HPzB 525",       "2315322190", 48.0, 549.0, 26.352,  913.0, 982.0, 528.0, 575.0, "T53221"),
    ("48V", "24-85-15", "SB350 azul", "48V 5 HPzS 575",       "",            48.0, 601.0, 28.848,  953.0, 840.0, 612.0, 585.0, ""),
    ("48V", "24-85-15", "SB350 azul", "48V 6 HPzS 690",       "2315329390", 48.0, 720.0, 35.088,  955.0, 980.0, 620.0, 590.0, "T53293"),
    ("48V", "24-85-17", "SB350 azul", "48V 6 HPzS 690 II",    "2315329390", 48.0, 720.0, 35.088,  955.0, 980.0, 620.0, 590.0, ""),
    ("48V", "24-85-19", "SB350 azul", "48V 7 HPzS 805",       "2315472490", 48.0, 841.0, 40.368, 1180.0, 983.0, 754.0, 580.0, "T54724"),
    ("48V", "24-85-21", "SB350 azul", "48V 8 HPzS 840",       "",            48.0, 878.0, 42.144, 1240.0, 977.0, 831.0, 560.0, "T53260"),
    ("48V", "24-125-13","SB350 azul", "48V 5 HPzS 775",       "",            48.0, 810.0, 38.880, 1364.0, 1119.0, 530.0, 785.0, "T19217"),
    ("48V", "24-125-15","SB350 azul", "48V 6 HPzS 930",       "",            48.0, 972.0, 46.656, 1320.0, 1023.0, 623.0, 775.0, "T54739"),
    ("80V", "40-125-9", "",           "80V 4 HPzS 620",       "T9329",       80.0, 648.0,  None,  1558.0, 1025.0, 708.0, 784.0, "T9329"),
    ("80V", "40-125-11","",           "80V 5 HPzS 775",       "T9330",       80.0, 810.0,  None,  1863.0, 1025.0, 852.0, 784.0, "T9330"),
    ("80V", "40-125-13","",           "80V 6 HPzS 930",       "T11183",      80.0, 972.0,  None,  2218.0, 1025.0, 996.0, 784.0, "T11183"),
]

EXCHANGE_RATES = [
    {"currency": "EUR", "rate_to_usd": Decimal("1.0800"), "fecha": "2026-04-11"},
    {"currency": "COP", "rate_to_usd": Decimal("0.0002500"), "fecha": "2026-04-11"},
]


def upgrade() -> None:
    bl_table = table(
        "business_lines",
        column("id", sa.Integer),
        column("nombre", sa.String),
        column("descripcion", sa.Text),
        column("activa", sa.Boolean),
    )
    op.bulk_insert(bl_table, [{**bl, "activa": True} for bl in BUSINESS_LINES])

    prod_table = table(
        "products",
        column("business_line_id", sa.Integer),
        column("voltaje", sa.String),
        column("referencia_usa", sa.String),
        column("tipo_conector", sa.String),
        column("modelo_hoppecke", sa.String),
        column("codigo_sap", sa.String),
        column("tension_v", sa.Numeric),
        column("capacidad_ah", sa.Numeric),
        column("kwh", sa.Numeric),
        column("peso_kg", sa.Numeric),
        column("largo_mm", sa.Numeric),
        column("ancho_mm", sa.Numeric),
        column("altura_mm", sa.Numeric),
        column("codigo_cofre", sa.String),
        column("activo", sa.Boolean),
    )
    products_rows = [
        {
            "business_line_id": 1,  # TRACCION
            "voltaje": p[0],
            "referencia_usa": p[1],
            "tipo_conector": p[2],
            "modelo_hoppecke": p[3],
            "codigo_sap": p[4] or None,
            "tension_v": p[5],
            "capacidad_ah": p[6],
            "kwh": p[7],
            "peso_kg": p[8],
            "largo_mm": p[9],
            "ancho_mm": p[10],
            "altura_mm": p[11],
            "codigo_cofre": p[12] or None,
            "activo": True,
        }
        for p in HOPPECKE_PRODUCTS
    ]
    op.bulk_insert(prod_table, products_rows)

    er_table = table(
        "exchange_rates",
        column("currency", sa.String),
        column("rate_to_usd", sa.Numeric),
        column("fecha", sa.Date),
    )
    op.bulk_insert(er_table, EXCHANGE_RATES)


def downgrade() -> None:
    op.execute("DELETE FROM exchange_rates")
    op.execute("DELETE FROM products")
    op.execute("DELETE FROM business_lines")
