from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from decimal import Decimal
from datetime import date

from app.database import get_db
from app.models.exchange_rate import ExchangeRate

router = APIRouter()


class ExchangeRateIn(BaseModel):
    currency: str
    rate_to_usd: Decimal
    fecha: date


class ExchangeRateOut(ExchangeRateIn):
    id: int

    class Config:
        from_attributes = True


@router.get("", response_model=list[ExchangeRateOut])
def list_rates(db: Session = Depends(get_db)):
    return db.query(ExchangeRate).order_by(ExchangeRate.fecha.desc()).limit(50).all()


@router.get("/latest")
def latest_rates(db: Session = Depends(get_db)):
    eur = (
        db.query(ExchangeRate)
        .filter(ExchangeRate.currency == "EUR")
        .order_by(ExchangeRate.fecha.desc())
        .first()
    )
    cop = (
        db.query(ExchangeRate)
        .filter(ExchangeRate.currency == "COP")
        .order_by(ExchangeRate.fecha.desc())
        .first()
    )
    return {
        "EUR": float(eur.rate_to_usd) if eur else None,
        "COP": float(cop.rate_to_usd) if cop else None,
        "fecha": eur.fecha.isoformat() if eur else None,
    }


@router.post("", response_model=ExchangeRateOut, status_code=201)
def create_rate(data: ExchangeRateIn, db: Session = Depends(get_db)):
    rate = ExchangeRate(**data.model_dump())
    db.add(rate)
    db.commit()
    db.refresh(rate)
    return rate
