from sqlalchemy import Boolean, Column, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.sql import func
from sqlalchemy.types import TIMESTAMP
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    business_line_id = Column(Integer, ForeignKey("business_lines.id"))
    voltaje = Column(String(10))
    referencia_usa = Column(String(50))
    tipo_conector = Column(String(30))
    modelo_hoppecke = Column(String(80), index=True)
    codigo_sap = Column(String(30))
    tension_v = Column(Numeric(6, 1))
    capacidad_ah = Column(Numeric(8, 1))
    kwh = Column(Numeric(8, 3))
    peso_kg = Column(Numeric(8, 1))
    largo_mm = Column(Numeric(8, 1))
    ancho_mm = Column(Numeric(8, 1))
    altura_mm = Column(Numeric(8, 1))
    codigo_cofre = Column(String(20))
    precio_neto_eur = Column(Numeric(12, 2))
    precio_neto_usd = Column(Numeric(12, 2))
    activo = Column(Boolean, default=True)
    categoria = Column(String(50), default="traccion")
    tecnologia = Column(String(50))
    descripcion_comercial = Column(Text)
    unidad = Column(String(30), default="unidad")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
