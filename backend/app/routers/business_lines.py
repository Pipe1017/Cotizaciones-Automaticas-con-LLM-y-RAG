from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.business_line import BusinessLine

router = APIRouter()


class BusinessLineOut(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str]
    activa: bool

    class Config:
        from_attributes = True


@router.get("", response_model=list[BusinessLineOut])
def list_business_lines(db: Session = Depends(get_db)):
    return db.query(BusinessLine).filter(BusinessLine.activa == True).order_by(BusinessLine.id).all()
