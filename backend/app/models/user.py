from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.sql import func
from sqlalchemy.types import TIMESTAMP

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    nombre = Column(String(100), nullable=False)
    hashed_password = Column(String(200), nullable=False)
    rol = Column(String(10), nullable=False, default="viewer")  # 'viewer' | 'editor'
    activo = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
