"""Líneas de negocio en español y productos placeholder para las 4 líneas nuevas

Revision ID: 005
Revises: 004
Create Date: 2026-04-12
"""

from alembic import op
from sqlalchemy import text

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None

# Nombres finales en español
NOMBRES_ES = {
    1: ("Baterías de Tracción",    "Baterías industriales HOPPECKE HPzB/HPzS para montacargas y vehículos eléctricos"),
    2: ("Baterías Estacionarias",  "Baterías estacionarias HOPPECKE Xgrid Xtreme para UPS, solar y telecomunicaciones"),
    3: ("Movilidad Eléctrica",     "Cargadores industriales, variadores de frecuencia y motores eléctricos"),
    4: ("Gases Industriales",      "Oxígeno puro, Argón puro e Hidrógeno verde para aplicaciones industriales"),
    5: ("Fertilizantes Verdes",    "NitroMag, Nitrato cálcico con magnesio y fertilizantes especializados"),
    6: ("Hidrógeno Verde",         "Electrolizadores PEM, celdas de combustible y sistemas de hidrógeno verde"),
}

# (bl_id, modelo, referencia, descripcion, unidad, precio_eur, precio_usd, categoria)
PRODUCTOS_PLACEHOLDER = [
    # Movilidad Eléctrica (id=3)
    (3, "Cargador Industrial 24V/48V", "MOV-CARG-48",
     "Cargador de alta frecuencia para baterías de tracción 24V y 48V. Compatible con conectores SB175 y Anderson.",
     300.00, 324.00, "movilidad"),
    (3, "Variador de Frecuencia ABB ACS580", "MOV-VAR-ACS580",
     "Variador de frecuencia ABB serie ACS580 para control de motores industriales AC. Rango 1.5–250 kW.",
     1200.00, 1296.00, "movilidad"),
    (3, "Motor Eléctrico DC Tracción 48V", "MOV-MOT-DC48",
     "Motor DC de tracción para montacargas y vehículos eléctricos industriales. 48V, 5–15 kW.",
     850.00, 918.00, "movilidad"),

    # Gases Industriales (id=4)
    (4, "Oxígeno Puro Industrial O2", "GAS-O2-IND",
     "Oxígeno puro grado industrial (99.5%) en cilindro de 10 m³. Para corte, soldadura y procesos industriales.",
     45.00, 48.60, "gases"),
    (4, "Argón Puro Ar", "GAS-AR-PUR",
     "Argón puro grado soldadura (99.997%) en cilindro de 10 m³. Para soldadura MIG/TIG y atmósferas inertes.",
     65.00, 70.20, "gases"),
    (4, "Hidrógeno Verde H2", "GAS-H2-VRD",
     "Hidrógeno verde producido por electrólisis renovable. Pureza 99.999%. Cilindro 10 m³ o suministro a granel.",
     120.00, 129.60, "gases"),

    # Fertilizantes Verdes (id=5)
    (5, "NitroMag", "FRT-NITROMAG",
     "Fertilizante nitrogenado con magnesio (27% N + 4% MgO). Granulado, aplicación directa al suelo.",
     38.00, 41.04, "fertilizantes"),
    (5, "Nitrato Cálcico + Magnesio", "FRT-CALIMAG",
     "Fertilizante de liberación rápida con calcio y magnesio (15.5% N + 19% CaO + 3% MgO). Uso foliar y fertirriego.",
     42.00, 45.36, "fertilizantes"),

    # Hidrógeno Verde (id=6)
    (6, "Celda de Combustible PEM 5kW", "H2-FC-PEM5K",
     "Sistema de celda de combustible de membrana de intercambio protónico (PEM). Potencia nominal 5 kW. Para movilidad y generación estacionaria.",
     8500.00, 9180.00, "hidrogeno"),
    (6, "Electrolizador PEM 1 Nm³/h", "H2-ELZ-PEM1",
     "Electrolizador PEM de producción de hidrógeno verde. Capacidad 1 Nm³/h H2. Presión de salida hasta 30 bar.",
     12000.00, 12960.00, "hidrogeno"),
]


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Renombrar líneas al español
    for bl_id, (nombre, descripcion) in NOMBRES_ES.items():
        conn.execute(
            text("UPDATE business_lines SET nombre=:n, descripcion=:d WHERE id=:id"),
            {"n": nombre, "d": descripcion, "id": bl_id},
        )

    # 2. Agregar campo descripcion_comercial si no existe
    conn.execute(text("""
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS descripcion_comercial TEXT,
        ADD COLUMN IF NOT EXISTS unidad VARCHAR(30) DEFAULT 'unidad'
    """))

    # 3. Insertar productos placeholder
    for bl_id, modelo, ref, desc, eur, usd, cat in PRODUCTOS_PLACEHOLDER:
        conn.execute(text("""
            INSERT INTO products
                (business_line_id, modelo_hoppecke, referencia_usa,
                 descripcion_comercial, precio_neto_eur, precio_neto_usd,
                 activo, categoria)
            VALUES
                (:bl_id, :modelo, :ref,
                 :desc, :eur, :usd,
                 true, :cat)
        """), {
            "bl_id": bl_id, "modelo": modelo, "ref": ref,
            "desc": desc, "eur": eur, "usd": usd, "cat": cat,
        })


def downgrade() -> None:
    # Revertir nombres al inglés (de migration 004)
    NOMBRES_EN = {
        1: "Traction Batteries",
        2: "Backup Batteries",
        3: "Electric Mobility",
        4: "Industrial Gases",
        5: "Green Fertilizers",
        6: "Green Hydrogen",
    }
    conn = op.get_bind()
    for bl_id, nombre in NOMBRES_EN.items():
        conn.execute(
            text("UPDATE business_lines SET nombre=:n WHERE id=:id"),
            {"n": nombre, "id": bl_id},
        )
    conn.execute(text(
        "DELETE FROM products WHERE referencia_usa IN "
        "('MOV-CARG-48','MOV-VAR-ACS580','MOV-MOT-DC48',"
        "'GAS-O2-IND','GAS-AR-PUR','GAS-H2-VRD',"
        "'FRT-NITROMAG','FRT-CALIMAG',"
        "'H2-FC-PEM5K','H2-ELZ-PEM1')"
    ))
