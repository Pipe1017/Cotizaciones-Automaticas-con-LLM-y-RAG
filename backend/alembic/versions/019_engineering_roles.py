"""Engineering roles catalog and quotation services

Revision ID: 019
Revises: 018
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

revision = '019'
down_revision = '018'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'engineering_roles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('tarifa_base_usd', sa.Numeric(10, 2), nullable=False),
        sa.Column('margen_pct', sa.Numeric(6, 2), nullable=False, server_default='30'),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        'quotation_services',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('quotation_id', sa.Integer(),
                  sa.ForeignKey('quotations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role_id', sa.Integer(),
                  sa.ForeignKey('engineering_roles.id', ondelete='SET NULL'), nullable=True),
        sa.Column('nombre', sa.String(150), nullable=False),       # nombre del rol en la cotización
        sa.Column('horas', sa.Numeric(8, 2), nullable=False),
        sa.Column('tarifa_hora_usd', sa.Numeric(10, 2), nullable=False),   # tarifa cliente (base + margen)
        sa.Column('tarifa_base_usd', sa.Numeric(10, 2), nullable=True),    # costo interno OPEX
        sa.Column('subtotal_usd', sa.Numeric(14, 2), nullable=False),
        sa.Column('motivo', sa.Text(), nullable=True),             # por qué se incluye (de la IA)
    )

    # Roles por defecto
    op.execute("""
        INSERT INTO engineering_roles (nombre, descripcion, tarifa_base_usd, margen_pct) VALUES
        ('Ingeniero Senior',  'Ingeniería eléctrica / electrónica senior, diseño y consultoría', 80.00, 35),
        ('Ingeniero Junior',  'Ingeniería eléctrica / electrónica junior, apoyo técnico',         50.00, 35),
        ('Técnico Instalador','Instalación, montaje y puesta en marcha de equipos en campo',      35.00, 30),
        ('Técnico de Servicio','Mantenimiento preventivo y correctivo de equipos',                35.00, 30),
        ('Diseñador',         'Diseño de planos eléctricos, diagramas y documentación técnica',  45.00, 30)
    """)


def downgrade():
    op.drop_table('quotation_services')
    op.drop_table('engineering_roles')
