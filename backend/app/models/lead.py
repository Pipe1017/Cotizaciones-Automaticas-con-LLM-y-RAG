from sqlalchemy import Column, Date, Integer, Numeric, String, Text
from sqlalchemy.sql import func
from sqlalchemy.types import TIMESTAMP
from sqlalchemy import ForeignKey
from app.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    empresa = Column(String(200), nullable=False, index=True)
    contacto = Column(String(200))
    cargo = Column(String(200))
    email = Column(String(200))
    telefono = Column(String(50))
    industria = Column(String(100))
    rol_estrategico = Column(String(60))   # Lead Directo, Equity/Inversor, Socio Estratégico, Sponsor, Offtaker
    responsable = Column(String(100))
    etapa = Column(String(50), default="Prospecto")
    prioridad = Column(String(10))         # Alta, Media, Baja
    fecha_ingreso = Column(Date)
    ultimo_contacto = Column(Date)
    proxima_accion = Column(Text)
    fecha_prox_acc = Column(Date)
    valor_estimado = Column(Numeric(14, 2))
    prob_cierre = Column(Numeric(5, 2))
    semana_iso = Column(String(10))        # YYYY-WXX
    linkedin_url = Column(Text)
    notas = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


class LeadHistory(Base):
    __tablename__ = "lead_history"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"))
    semana = Column(String(10))
    fecha = Column(Date)
    etapa_anterior = Column(String(50))
    etapa_nueva = Column(String(50))
    accion_realizada = Column(Text)
    resultado = Column(Text)
    responsable = Column(String(100))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
