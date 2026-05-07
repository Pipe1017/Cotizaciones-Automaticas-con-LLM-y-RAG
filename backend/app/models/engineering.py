from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.sql import func
from app.database import Base


class EngineeringRole(Base):
    __tablename__ = "engineering_roles"

    id             = Column(Integer, primary_key=True)
    nombre         = Column(String(100), nullable=False)
    descripcion    = Column(Text, nullable=True)
    tarifa_base_usd = Column(Numeric(10, 2), nullable=False)
    margen_pct     = Column(Numeric(6, 2), nullable=False, default=30)
    activo         = Column(Boolean, nullable=False, default=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def tarifa_cliente_usd(self):
        return float(self.tarifa_base_usd) * (1 + float(self.margen_pct) / 100)


class QuotationService(Base):
    __tablename__ = "quotation_services"

    id             = Column(Integer, primary_key=True)
    quotation_id   = Column(Integer, ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False)
    role_id        = Column(Integer, ForeignKey("engineering_roles.id", ondelete="SET NULL"), nullable=True)
    nombre         = Column(String(150), nullable=False)
    horas          = Column(Numeric(8, 2), nullable=False)
    tarifa_hora_usd = Column(Numeric(10, 2), nullable=False)  # precio cliente
    tarifa_base_usd = Column(Numeric(10, 2), nullable=True)   # costo interno
    subtotal_usd   = Column(Numeric(14, 2), nullable=False)
    motivo         = Column(Text, nullable=True)
