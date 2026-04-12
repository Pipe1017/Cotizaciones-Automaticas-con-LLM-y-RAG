from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models.contact import Contact

router = APIRouter()


class ContactIn(BaseModel):
    company_id: Optional[int] = None
    nombre: str
    cargo: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    linkedin_url: Optional[str] = None


class ContactOut(ContactIn):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=list[ContactOut])
def list_contacts(
    company_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(Contact)
    if company_id:
        q = q.filter(Contact.company_id == company_id)
    if search:
        q = q.filter(Contact.nombre.ilike(f"%{search}%"))
    return q.order_by(Contact.nombre).offset(skip).limit(limit).all()


@router.get("/{contact_id}", response_model=ContactOut)
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    c = db.query(Contact).filter(Contact.id == contact_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    return c


@router.post("", response_model=ContactOut, status_code=201)
def create_contact(data: ContactIn, db: Session = Depends(get_db)):
    c = Contact(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.put("/{contact_id}", response_model=ContactOut)
def update_contact(contact_id: int, data: ContactIn, db: Session = Depends(get_db)):
    c = db.query(Contact).filter(Contact.id == contact_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    c = db.query(Contact).filter(Contact.id == contact_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    db.delete(c)
    db.commit()
