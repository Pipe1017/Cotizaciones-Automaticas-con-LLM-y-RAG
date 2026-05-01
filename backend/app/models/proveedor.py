from sqlalchemy import Boolean, Column, Integer, String, Text
from sqlalchemy.sql import func
from sqlalchemy.types import TIMESTAMP
from app.database import Base


class Proveedor(Base):
    __tablename__ = "proveedores"

    id               = Column(Integer, primary_key=True, index=True)
    nombre           = Column(String(200), nullable=False, index=True)
    pais             = Column(String(60), default="Colombia")
    sitio_web        = Column(String(200))
    contacto_nombre  = Column(String(100))
    contacto_email   = Column(String(200))
    notas            = Column(Text)
    activo           = Column(Boolean, default=True)
    created_at       = Column(TIMESTAMP(timezone=True), server_default=func.now())
