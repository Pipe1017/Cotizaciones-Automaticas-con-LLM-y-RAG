from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.sql import func
from sqlalchemy.types import TIMESTAMP
from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False, index=True)
    tipo = Column(String(20), nullable=False, default="cliente")  # 'cliente' | 'prospecto'
    industria = Column(String(100))
    ciudad = Column(String(100))
    region = Column(String(10))  # BOG, MED, CLO, CTG, BAQ, PEI
    pais = Column(String(60), default="Colombia")
    modulo = Column(String(30), nullable=False, default="energia_backup")
    activa = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
