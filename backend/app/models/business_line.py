from sqlalchemy import Boolean, Column, Integer, String, Text
from app.database import Base


class BusinessLine(Base):
    __tablename__ = "business_lines"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(60), unique=True, nullable=False)
    descripcion = Column(Text)
    activa = Column(Boolean, default=True)
