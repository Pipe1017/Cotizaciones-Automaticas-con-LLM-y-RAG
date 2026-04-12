from sqlalchemy import Column, Date, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func
from sqlalchemy.types import TIMESTAMP
from app.database import Base


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"))
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    tipo = Column(String(60))       # Llamada, Email, Reunión, Cotización, OC
    descripcion = Column(Text)
    resultado = Column(Text)
    responsable = Column(String(100))
    fecha = Column(Date, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
