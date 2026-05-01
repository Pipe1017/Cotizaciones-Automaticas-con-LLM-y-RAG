from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models.company import Company

router = APIRouter()


class CompanyIn(BaseModel):
    nombre: str
    tipo: Optional[str] = "cliente"  # 'cliente' | 'prospecto'
    industria: Optional[str] = None
    ciudad: Optional[str] = None
    region: Optional[str] = None
    pais: Optional[str] = "Colombia"
    modulo: Optional[str] = "energia_backup"


class CompanyOut(CompanyIn):
    id: int
    activa: bool
    modulo: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=list[CompanyOut])
def list_companies(
    search: Optional[str] = None,
    tipo: Optional[str] = None,
    modulo: Optional[str] = None,
    skip: int = 0,
    limit: int = 300,
    db: Session = Depends(get_db),
):
    q = db.query(Company).filter(Company.activa == True)
    if search:
        q = q.filter(Company.nombre.ilike(f"%{search}%"))
    if tipo:
        q = q.filter(Company.tipo == tipo)
    if modulo:
        q = q.filter(Company.modulo == modulo)
    return q.order_by(Company.nombre).offset(skip).limit(limit).all()


@router.get("/{company_id}", response_model=CompanyOut)
def get_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return company


@router.post("", response_model=CompanyOut, status_code=201)
def create_company(data: CompanyIn, db: Session = Depends(get_db)):
    company = Company(**data.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.put("/{company_id}", response_model=CompanyOut)
def update_company(company_id: int, data: CompanyIn, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(company, k, v)
    db.commit()
    db.refresh(company)
    return company


@router.delete("/{company_id}", status_code=204)
def delete_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    company.activa = False
    db.commit()
