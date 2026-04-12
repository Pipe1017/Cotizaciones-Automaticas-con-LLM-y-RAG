"""Real companies, contacts, tipo field, manual upload fields on opportunities

Revision ID: 007
Revises: 006
Create Date: 2026-04-12
"""
from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add tipo column to companies
    op.add_column("companies", sa.Column("tipo", sa.String(20), nullable=False, server_default="cliente"))

    # 2. Add manual upload fields to opportunities
    op.add_column("opportunities", sa.Column("file_manual_excel", sa.Text(), nullable=True))
    op.add_column("opportunities", sa.Column("file_manual_pdf", sa.Text(), nullable=True))

    # 3. Clear ALL existing fake data (order matters for FKs)
    op.execute("DELETE FROM quotation_items")
    op.execute("UPDATE opportunities SET quotation_id = NULL")
    op.execute("DELETE FROM quotations")
    op.execute("DELETE FROM opportunities")
    op.execute("DELETE FROM contacts")
    op.execute("DELETE FROM companies")

    # 4. Insert real client companies
    op.execute("""
        INSERT INTO companies (nombre, tipo, industria, ciudad, region, pais, activa) VALUES
        ('Alimentos Cárnicos', 'cliente', 'Alimentos', 'Medellín', 'MED', 'Colombia', true),
        ('Alimentos Zenú', 'cliente', 'Alimentos', 'Medellín', 'MED', 'Colombia', true),
        ('Colcafe', 'cliente', 'Alimentos', 'Medellín', 'MED', 'Colombia', true),
        ('La Recetta', 'cliente', 'Alimentos', 'Medellín', 'MED', 'Colombia', true),
        ('Chocolates', 'cliente', 'Alimentos', 'Medellín', 'MED', 'Colombia', true),
        ('AMYM', 'cliente', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('VEMEQ', 'cliente', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('Apix', 'cliente', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('Cargar SAS', 'cliente', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('Grupo Familia (Essity)', 'cliente', 'Consumo masivo', 'Medellín', 'MED', 'Colombia', true),
        ('GYM Montacargas', 'cliente', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('FYR Servicios', 'cliente', 'Servicios', 'Medellín', 'MED', 'Colombia', true),
        ('Unimaq SA', 'cliente', 'Logística', 'Medellín', 'MED', 'Colombia', true)
    """)

    # 5. Insert real prospect companies
    op.execute("""
        INSERT INTO companies (nombre, tipo, industria, ciudad, region, pais, activa) VALUES
        ('ACL Logística', 'prospecto', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('Axionlog', 'prospecto', 'Logística', 'Bogotá', 'BOG', 'Colombia', true),
        ('Carga Pesada', 'prospecto', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('Colombina', 'prospecto', 'Alimentos', 'Cali', 'CLO', 'Colombia', true),
        ('Harinera del Valle', 'prospecto', 'Alimentos', 'Cali', 'CLO', 'Colombia', true),
        ('JMC Colombia', 'prospecto', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('Novaventa', 'prospecto', 'Consumo masivo', 'Medellín', 'MED', 'Colombia', true),
        ('Logistral', 'prospecto', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('Pepsico', 'prospecto', 'Alimentos', 'Bogotá', 'BOG', 'Colombia', true),
        ('Montacargas el Zafiro', 'prospecto', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('Derco', 'prospecto', 'Automotriz', 'Bogotá', 'BOG', 'Colombia', true),
        ('Logren', 'prospecto', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('Alimentos Polar', 'prospecto', 'Alimentos', 'Bogotá', 'BOG', 'Colombia', true),
        ('Alpina', 'prospecto', 'Alimentos', 'Bogotá', 'BOG', 'Colombia', true),
        ('Bayer', 'prospecto', 'Farmacéutica', 'Bogotá', 'BOG', 'Colombia', true),
        ('Rentalmaq', 'prospecto', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('Montecol', 'prospecto', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('Internacional de MTC', 'prospecto', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('CJ Montacargas', 'prospecto', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('Distoyota', 'prospecto', 'Automotriz', 'Medellín', 'MED', 'Colombia', true),
        ('Corporación Diana', 'prospecto', 'Alimentos', 'Medellín', 'MED', 'Colombia', true),
        ('Belcorp', 'prospecto', 'Consumo masivo', 'Bogotá', 'BOG', 'Colombia', true),
        ('DHL', 'prospecto', 'Logística', 'Bogotá', 'BOG', 'Colombia', true),
        ('Lloreda', 'prospecto', 'Alimentos', 'Cali', 'CLO', 'Colombia', true),
        ('Nutrium', 'prospecto', 'Alimentos', 'Medellín', 'MED', 'Colombia', true),
        ('Royal America', 'prospecto', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('Colgate', 'prospecto', 'Consumo masivo', 'Bogotá', 'BOG', 'Colombia', true),
        ('Uniban', 'prospecto', 'Agro', 'Medellín', 'MED', 'Colombia', true),
        ('Banacol', 'prospecto', 'Agro', 'Medellín', 'MED', 'Colombia', true),
        ('Montacargas Master', 'prospecto', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('Montacargas MYM', 'prospecto', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('3PSL', 'prospecto', 'Logística', 'Medellín', 'MED', 'Colombia', true),
        ('Comestibles Dan', 'prospecto', 'Alimentos', 'Bogotá', 'BOG', 'Colombia', true),
        ('Factorias Asociadas', 'prospecto', 'Manufactura', 'Medellín', 'MED', 'Colombia', true),
        ('Colanta', 'prospecto', 'Alimentos', 'Medellín', 'MED', 'Colombia', true),
        ('Quala', 'prospecto', 'Consumo masivo', 'Bogotá', 'BOG', 'Colombia', true)
    """)

    # 6. Insert contacts for client companies
    op.execute("""
        INSERT INTO contacts (company_id, nombre, cargo)
        SELECT c.id, v.nombre, v.cargo FROM companies c
        JOIN (VALUES
            ('Alimentos Cárnicos', 'Isabel Palacio', 'Contacto'),
            ('Alimentos Cárnicos', 'Yasmin Tocoche', 'Contacto'),
            ('Alimentos Cárnicos', 'Ana Cordoba', 'Contacto'),
            ('Alimentos Zenú', 'Carlos Bonilla', 'Contacto'),
            ('Alimentos Zenú', 'Cesar Roman', 'Contacto'),
            ('Colcafe', 'Jorge Ruiz', 'Contacto'),
            ('La Recetta', 'Jhon Rios', 'Contacto'),
            ('Chocolates', 'Edgar Quintero', 'Contacto'),
            ('Chocolates', 'Juan Camilo Narvaez', 'Contacto'),
            ('AMYM', 'Lida Restrepo', 'Contacto'),
            ('AMYM', 'Juan David Vasquez', 'Contacto'),
            ('VEMEQ', 'Julian Hoyos', 'Contacto'),
            ('Apix', 'Karen Sofia Cobo', 'Contacto'),
            ('Cargar SAS', 'Gabriel Gamarra', 'Contacto'),
            ('Grupo Familia (Essity)', 'Karen Martinez', 'Contacto'),
            ('Grupo Familia (Essity)', 'Camilo Bedoya', 'Contacto'),
            ('GYM Montacargas', 'Hugo Garro', 'Contacto'),
            ('FYR Servicios', 'Jorge Foronda', 'Contacto'),
            ('Unimaq SA', 'Mauricio Peraza', 'Contacto')
        ) AS v(empresa, nombre, cargo) ON c.nombre = v.empresa
    """)


def downgrade():
    op.drop_column("opportunities", "file_manual_pdf")
    op.drop_column("opportunities", "file_manual_excel")
    op.drop_column("companies", "tipo")
