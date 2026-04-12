from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func
from sqlalchemy.types import TIMESTAMP
from app.database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"))
    nombre = Column(String(200), nullable=False)
    cargo = Column(String(200))
    email = Column(String(200), index=True)
    telefono = Column(String(50))
    linkedin_url = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
