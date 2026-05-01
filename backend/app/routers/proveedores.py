from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.proveedor import Proveedor

router = APIRouter()


class ProveedorIn(BaseModel):
    nombre: str
    pais: Optional[str] = "Colombia"
    sitio_web: Optional[str] = None
    contacto_nombre: Optional[str] = None
    contacto_email: Optional[str] = None
    notas: Optional[str] = None


class ProveedorOut(ProveedorIn):
    id: int
    activo: bool

    class Config:
        from_attributes = True


@router.get("", response_model=list[ProveedorOut])
def list_proveedores(db: Session = Depends(get_db)):
    return db.query(Proveedor).filter(Proveedor.activo == True).order_by(Proveedor.nombre).all()


@router.post("", response_model=ProveedorOut, status_code=201)
def create_proveedor(data: ProveedorIn, db: Session = Depends(get_db)):
    p = Proveedor(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.put("/{proveedor_id}", response_model=ProveedorOut)
def update_proveedor(proveedor_id: int, data: ProveedorIn, db: Session = Depends(get_db)):
    p = db.query(Proveedor).filter(Proveedor.id == proveedor_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{proveedor_id}", status_code=204)
def delete_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    p = db.query(Proveedor).filter(Proveedor.id == proveedor_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    p.activo = False
    db.commit()
