from sqlalchemy import Column, Date, Integer, Numeric, String
from sqlalchemy.sql import func
from sqlalchemy.types import TIMESTAMP
from app.database import Base


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    id = Column(Integer, primary_key=True, index=True)
    currency = Column(String(5), nullable=False)   # EUR, COP
    rate_to_usd = Column(Numeric(12, 4), nullable=False)
    fecha = Column(Date, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
