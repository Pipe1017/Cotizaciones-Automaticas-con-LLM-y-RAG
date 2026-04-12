from sqlalchemy import Column, Date, ForeignKey, Integer, Numeric, SmallInteger, String, Text
from sqlalchemy.sql import func
from sqlalchemy.types import TIMESTAMP
from app.database import Base


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"))
    company_id = Column(Integer, ForeignKey("companies.id"))
    numero_cotizacion = Column(String(50), unique=True, nullable=False, index=True)
    fecha = Column(Date, nullable=False)
    contacto_nombre = Column(String(200))
    subtotal_usd = Column(Numeric(14, 2))
    iva_pct = Column(Numeric(5, 2), default=19.0)
    total_usd = Column(Numeric(14, 2))
    moneda = Column(String(5), default="USD")
    tipo_cambio_eur = Column(Numeric(12, 4))
    observaciones = Column(Text)
    condiciones_entrega = Column(Text)
    condiciones_pago = Column(Text)
    condiciones_garantia = Column(Text)
    validez_oferta = Column(String(100))
    fecha_entrega = Column(String(100))
    ciudad_cotizacion = Column(String(50), default="med")
    business_line_id = Column(Integer, ForeignKey("business_lines.id"), nullable=True)
    estado = Column(String(20), default="borrador")  # borrador, enviada, aprobada, rechazada
    asesor = Column(String(100))
    file_path_minio = Column(Text)          # Excel
    file_path_carta = Column(Text)          # Word carta
    file_path_cotizacion = Column(Text)     # Word cotización
    file_path_pdf = Column(Text)            # PDF combinado
    version = Column(Integer, nullable=False, default=1)
    parent_quotation_id = Column(Integer, ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(String(100))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id", ondelete="CASCADE"))
    item_number = Column(SmallInteger, nullable=False)
    referencia_usa = Column(String(50))
    descripcion = Column(Text, nullable=False)
    referencia_cod_proveedor = Column(String(50))
    marca = Column(String(50), default="HOPPECKE")
    cantidad = Column(Numeric(8, 2), nullable=False)
    precio_unitario_usd = Column(Numeric(12, 2), nullable=False)
    precio_total_usd = Column(Numeric(14, 2), nullable=False)
