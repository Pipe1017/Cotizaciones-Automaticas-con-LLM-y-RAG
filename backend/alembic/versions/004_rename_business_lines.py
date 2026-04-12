"""Rename business lines to new OPEX strategy names

Revision ID: 004
Revises: 003
Create Date: 2026-04-12

Mapping (keeping same IDs to preserve FK relationships):
  1: TRACCION       → Traction Batteries
  2: ESTACIONARIA   → Backup Batteries
  3: DRIVES         → Electric Mobility
  4: LOGISTICA      → Industrial Gases
  5: QUIMICOS       → Green Fertilizers
  6: PROYECTOS      → Green Hydrogen
"""

from alembic import op
from sqlalchemy import text

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None

NEW_NAMES = {
    1: ("Traction Batteries",   "Baterias de traccion HOPPECKE HPzB/HPzS para montacargas y vehiculos electricos"),
    2: ("Backup Batteries",     "Baterias estacionarias HOPPECKE Xgrid Xtreme para UPS, solar y telecomunicaciones"),
    3: ("Electric Mobility",    "Movilidad electrica, variadores de frecuencia y sistemas de propulsion"),
    4: ("Industrial Gases",     "Gases industriales y especiales para aplicaciones de manufactura y proceso"),
    5: ("Green Fertilizers",    "Fertilizantes verdes y quimicos para el sector agricola"),
    6: ("Green Hydrogen",       "Hidrogeno verde: movilidad, celdas de combustible y suministro de hidrogeno"),
}

OLD_NAMES = {
    1: ("TRACCION",     "Baterias industriales HOPPECKE para montacargas y equipo de traccion"),
    2: ("ESTACIONARIA", "Baterias de respaldo estacionario y sistemas UPS"),
    3: ("DRIVES",       "Variadores de frecuencia y arrancadores suaves AB/ABB"),
    4: ("LOGISTICA",    "Servicios logisticos y consumibles"),
    5: ("QUIMICOS",     "Fertilizantes y quimicos para sector agricola"),
    6: ("PROYECTOS",    "Licitaciones, proyectos especiales y nuevas tecnologias"),
}


def upgrade() -> None:
    conn = op.get_bind()
    for bl_id, (nombre, descripcion) in NEW_NAMES.items():
        conn.execute(
            text("UPDATE business_lines SET nombre=:n, descripcion=:d WHERE id=:id"),
            {"n": nombre, "d": descripcion, "id": bl_id},
        )


def downgrade() -> None:
    conn = op.get_bind()
    for bl_id, (nombre, descripcion) in OLD_NAMES.items():
        conn.execute(
            text("UPDATE business_lines SET nombre=:n, descripcion=:d WHERE id=:id"),
            {"n": nombre, "d": descripcion, "id": bl_id},
        )
