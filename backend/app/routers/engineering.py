from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

from app.database import get_db
from app.core.deps import require_editor
from app.models.engineering import EngineeringRole

router = APIRouter()


class RoleIn(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    tarifa_base_usd: Decimal
    margen_pct: Decimal = Decimal("30")
    activo: bool = True


class RoleOut(RoleIn):
    id: int
    tarifa_cliente_usd: float

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        d = {
            "id": obj.id,
            "nombre": obj.nombre,
            "descripcion": obj.descripcion,
            "tarifa_base_usd": obj.tarifa_base_usd,
            "margen_pct": obj.margen_pct,
            "activo": obj.activo,
            "tarifa_cliente_usd": float(obj.tarifa_base_usd) * (1 + float(obj.margen_pct) / 100),
        }
        return cls(**d)


@router.get("", response_model=list[RoleOut])
def list_roles(db: Session = Depends(get_db)):
    roles = db.query(EngineeringRole).order_by(EngineeringRole.nombre).all()
    return [RoleOut.from_orm(r) for r in roles]


@router.post("", response_model=RoleOut, status_code=201)
def create_role(data: RoleIn, db: Session = Depends(get_db), _=Depends(require_editor)):
    role = EngineeringRole(**data.model_dump())
    db.add(role)
    db.commit()
    db.refresh(role)
    return RoleOut.from_orm(role)


@router.put("/{role_id}", response_model=RoleOut)
def update_role(role_id: int, data: RoleIn, db: Session = Depends(get_db), _=Depends(require_editor)):
    role = db.query(EngineeringRole).filter(EngineeringRole.id == role_id).first()
    if not role:
        raise HTTPException(404, "Rol no encontrado")
    for k, v in data.model_dump().items():
        setattr(role, k, v)
    db.commit()
    db.refresh(role)
    return RoleOut.from_orm(role)


@router.delete("/{role_id}", status_code=204)
def delete_role(role_id: int, db: Session = Depends(get_db), _=Depends(require_editor)):
    role = db.query(EngineeringRole).filter(EngineeringRole.id == role_id).first()
    if not role:
        raise HTTPException(404, "Rol no encontrado")
    role.activo = False
    db.commit()
