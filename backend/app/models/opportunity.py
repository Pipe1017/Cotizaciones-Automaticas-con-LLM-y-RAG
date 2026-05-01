from sqlalchemy import Column, Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.sql import func
from sqlalchemy.types import TIMESTAMP
from app.database import Base


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    business_line_id = Column(Integer, ForeignKey("business_lines.id"))
    titulo = Column(String(300), nullable=False)
    descripcion = Column(Text)
    valor_usd = Column(Numeric(14, 2))
    probabilidad = Column(String(30), nullable=True)  # deprecated
    etapa = Column(String(50))   # In Progress, Won, Lost, No Bid, Cancelled by Client
    prob_go  = Column(Integer, default=50)  # % el cliente ejecuta el proyecto
    prob_get = Column(Integer, default=50)  # % OPEX gana si el cliente ejecuta
    asesor = Column(String(100))
    apoyo_ra = Column(String(100))
    mes_esperado = Column(Date)
    observaciones = Column(Text)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), unique=True, nullable=True)
    numero_oportunidad = Column(String(50))
    fecha_oportunidad = Column(Date, nullable=True)
    # Campos internos de costeo (no aparecen en documentos de cotización)
    landed_pct = Column(Numeric(6, 2), default=0)   # % importación y nacionalización
    margen_pct = Column(Numeric(6, 2), default=0)   # % margen comercial OPEX
    # Archivos manuales para propuestas externas
    file_manual_excel = Column(Text, nullable=True)
    file_manual_pdf = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
