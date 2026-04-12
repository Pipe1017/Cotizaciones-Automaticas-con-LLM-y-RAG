from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal

from app.database import get_db
from app.models.lead import Lead, LeadHistory

router = APIRouter()

ETAPAS = [
    "Prospecto",
    "Contactado",
    "Reunión Agendada",
    "Propuesta Enviada",
    "Negociación",
    "Cerrado",
    "Perdido",
    "En Pausa",
]


class LeadIn(BaseModel):
    empresa: str
    contacto: Optional[str] = None
    cargo: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    industria: Optional[str] = None
    rol_estrategico: Optional[str] = None
    responsable: Optional[str] = None
    etapa: Optional[str] = "Prospecto"
    prioridad: Optional[str] = None
    fecha_ingreso: Optional[date] = None
    ultimo_contacto: Optional[date] = None
    proxima_accion: Optional[str] = None
    fecha_prox_acc: Optional[date] = None
    valor_estimado: Optional[Decimal] = None
    prob_cierre: Optional[Decimal] = None
    semana_iso: Optional[str] = None
    linkedin_url: Optional[str] = None
    notas: Optional[str] = None


class LeadOut(LeadIn):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class StageUpdateIn(BaseModel):
    etapa_nueva: str
    accion_realizada: Optional[str] = None
    resultado: Optional[str] = None
    responsable: Optional[str] = None


@router.get("", response_model=list[LeadOut])
def list_leads(
    etapa: Optional[str] = None,
    responsable: Optional[str] = None,
    prioridad: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    q = db.query(Lead)
    if etapa:
        q = q.filter(Lead.etapa == etapa)
    if responsable:
        q = q.filter(Lead.responsable.ilike(f"%{responsable}%"))
    if prioridad:
        q = q.filter(Lead.prioridad == prioridad)
    if search:
        q = q.filter(Lead.empresa.ilike(f"%{search}%"))
    return q.order_by(Lead.empresa).offset(skip).limit(limit).all()


@router.get("/etapas")
def get_etapas():
    return ETAPAS


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    return lead


@router.post("", response_model=LeadOut, status_code=201)
def create_lead(data: LeadIn, db: Session = Depends(get_db)):
    lead = Lead(**data.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.put("/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: int, data: LeadIn, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(lead, k, v)
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/{lead_id}/advance", response_model=LeadOut)
def advance_stage(lead_id: int, data: StageUpdateIn, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")

    from datetime import date as dt_date
    history = LeadHistory(
        lead_id=lead_id,
        fecha=dt_date.today(),
        etapa_anterior=lead.etapa,
        etapa_nueva=data.etapa_nueva,
        accion_realizada=data.accion_realizada,
        resultado=data.resultado,
        responsable=data.responsable or lead.responsable,
    )
    db.add(history)
    lead.etapa = data.etapa_nueva
    lead.ultimo_contacto = dt_date.today()
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/{lead_id}/history")
def get_lead_history(lead_id: int, db: Session = Depends(get_db)):
    return (
        db.query(LeadHistory)
        .filter(LeadHistory.lead_id == lead_id)
        .order_by(LeadHistory.fecha.desc())
        .all()
    )
