"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-11
"""

from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "business_lines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(60), nullable=False, unique=True),
        sa.Column("descripcion", sa.Text()),
        sa.Column("activa", sa.Boolean(), default=True),
    )

    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("industria", sa.String(100)),
        sa.Column("ciudad", sa.String(100)),
        sa.Column("region", sa.String(10)),
        sa.Column("pais", sa.String(60), server_default="Colombia"),
        sa.Column("activa", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_companies_nombre", "companies", ["nombre"])

    op.create_table(
        "contacts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE")),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("cargo", sa.String(200)),
        sa.Column("email", sa.String(200)),
        sa.Column("telefono", sa.String(50)),
        sa.Column("linkedin_url", sa.Text()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_contacts_email", "contacts", ["email"])

    op.create_table(
        "opportunities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id")),
        sa.Column("contact_id", sa.Integer(), sa.ForeignKey("contacts.id")),
        sa.Column("business_line_id", sa.Integer(), sa.ForeignKey("business_lines.id")),
        sa.Column("titulo", sa.String(300), nullable=False),
        sa.Column("descripcion", sa.Text()),
        sa.Column("valor_usd", sa.Numeric(14, 2)),
        sa.Column("probabilidad", sa.String(30)),
        sa.Column("etapa", sa.String(50)),
        sa.Column("asesor", sa.String(100)),
        sa.Column("apoyo_ra", sa.String(100)),
        sa.Column("mes_esperado", sa.Date()),
        sa.Column("observaciones", sa.Text()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "activities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("opportunity_id", sa.Integer(), sa.ForeignKey("opportunities.id")),
        sa.Column("contact_id", sa.Integer(), sa.ForeignKey("contacts.id")),
        sa.Column("tipo", sa.String(60)),
        sa.Column("descripcion", sa.Text()),
        sa.Column("resultado", sa.Text()),
        sa.Column("responsable", sa.String(100)),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("business_line_id", sa.Integer(), sa.ForeignKey("business_lines.id")),
        sa.Column("voltaje", sa.String(10)),
        sa.Column("referencia_usa", sa.String(50)),
        sa.Column("tipo_conector", sa.String(30)),
        sa.Column("modelo_hoppecke", sa.String(80)),
        sa.Column("codigo_sap", sa.String(30)),
        sa.Column("tension_v", sa.Numeric(6, 1)),
        sa.Column("capacidad_ah", sa.Numeric(8, 1)),
        sa.Column("kwh", sa.Numeric(8, 3)),
        sa.Column("peso_kg", sa.Numeric(8, 1)),
        sa.Column("largo_mm", sa.Numeric(8, 1)),
        sa.Column("ancho_mm", sa.Numeric(8, 1)),
        sa.Column("altura_mm", sa.Numeric(8, 1)),
        sa.Column("codigo_cofre", sa.String(20)),
        sa.Column("precio_neto_eur", sa.Numeric(12, 2)),
        sa.Column("precio_neto_usd", sa.Numeric(12, 2)),
        sa.Column("activo", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_products_modelo_hoppecke", "products", ["modelo_hoppecke"])

    op.create_table(
        "exchange_rates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("currency", sa.String(5), nullable=False),
        sa.Column("rate_to_usd", sa.Numeric(12, 4), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "quotations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("opportunity_id", sa.Integer(), sa.ForeignKey("opportunities.id")),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id")),
        sa.Column("numero_cotizacion", sa.String(50), unique=True, nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("contacto_nombre", sa.String(200)),
        sa.Column("subtotal_usd", sa.Numeric(14, 2)),
        sa.Column("iva_pct", sa.Numeric(5, 2), server_default="19.0"),
        sa.Column("total_usd", sa.Numeric(14, 2)),
        sa.Column("moneda", sa.String(5), server_default="USD"),
        sa.Column("tipo_cambio_eur", sa.Numeric(12, 4)),
        sa.Column("observaciones", sa.Text()),
        sa.Column("condiciones_entrega", sa.Text()),
        sa.Column("condiciones_pago", sa.Text()),
        sa.Column("condiciones_garantia", sa.Text()),
        sa.Column("validez_oferta", sa.String(100)),
        sa.Column("fecha_entrega", sa.String(100)),
        sa.Column("estado", sa.String(20), server_default="borrador"),
        sa.Column("file_path_minio", sa.Text()),
        sa.Column("created_by", sa.String(100)),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_quotations_numero", "quotations", ["numero_cotizacion"])

    op.create_table(
        "quotation_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("quotation_id", sa.Integer(), sa.ForeignKey("quotations.id", ondelete="CASCADE")),
        sa.Column("item_number", sa.SmallInteger(), nullable=False),
        sa.Column("referencia_usa", sa.String(50)),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.Column("referencia_cod_proveedor", sa.String(50)),
        sa.Column("marca", sa.String(50), server_default="HOPPECKE"),
        sa.Column("cantidad", sa.Numeric(8, 2), nullable=False),
        sa.Column("precio_unitario_usd", sa.Numeric(12, 2), nullable=False),
        sa.Column("precio_total_usd", sa.Numeric(14, 2), nullable=False),
    )

    op.create_table(
        "leads",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("empresa", sa.String(200), nullable=False),
        sa.Column("contacto", sa.String(200)),
        sa.Column("cargo", sa.String(200)),
        sa.Column("email", sa.String(200)),
        sa.Column("telefono", sa.String(50)),
        sa.Column("industria", sa.String(100)),
        sa.Column("rol_estrategico", sa.String(60)),
        sa.Column("responsable", sa.String(100)),
        sa.Column("etapa", sa.String(50), server_default="Prospecto"),
        sa.Column("prioridad", sa.String(10)),
        sa.Column("fecha_ingreso", sa.Date()),
        sa.Column("ultimo_contacto", sa.Date()),
        sa.Column("proxima_accion", sa.Text()),
        sa.Column("fecha_prox_acc", sa.Date()),
        sa.Column("valor_estimado", sa.Numeric(14, 2)),
        sa.Column("prob_cierre", sa.Numeric(5, 2)),
        sa.Column("semana_iso", sa.String(10)),
        sa.Column("linkedin_url", sa.Text()),
        sa.Column("notas", sa.Text()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_leads_empresa", "leads", ["empresa"])

    op.create_table(
        "lead_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lead_id", sa.Integer(), sa.ForeignKey("leads.id", ondelete="CASCADE")),
        sa.Column("semana", sa.String(10)),
        sa.Column("fecha", sa.Date()),
        sa.Column("etapa_anterior", sa.String(50)),
        sa.Column("etapa_nueva", sa.String(50)),
        sa.Column("accion_realizada", sa.Text()),
        sa.Column("resultado", sa.Text()),
        sa.Column("responsable", sa.String(100)),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("lead_history")
    op.drop_table("leads")
    op.drop_table("quotation_items")
    op.drop_table("quotations")
    op.drop_table("exchange_rates")
    op.drop_table("products")
    op.drop_table("activities")
    op.drop_table("opportunities")
    op.drop_table("contacts")
    op.drop_table("companies")
    op.drop_table("business_lines")
