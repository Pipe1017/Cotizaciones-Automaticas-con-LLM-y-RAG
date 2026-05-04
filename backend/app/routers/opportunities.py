from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
import io

from app.database import get_db
from app.models.opportunity import Opportunity

router = APIRouter()


class OpportunityIn(BaseModel):
    company_id: Optional[int] = None
    contact_id: Optional[int] = None
    business_line_id: Optional[int] = None
    titulo: str
    descripcion: Optional[str] = None
    valor_usd: Optional[Decimal] = None
    etapa: Optional[str] = "In Progress"
    asesor: Optional[str] = None
    apoyo_ra: Optional[str] = None
    mes_esperado: Optional[date] = None
    observaciones: Optional[str] = None
    fecha_oportunidad: Optional[date] = None
    prob_go:  Optional[int] = 50   # % el cliente ejecuta el proyecto (0-100)
    prob_get: Optional[int] = 50   # % OPEX gana si ejecutan (0-100)
    # Campos internos de costeo
    landed_pct: Optional[Decimal] = Decimal("0")
    margen_pct: Optional[Decimal] = Decimal("0")


class OpportunityOut(OpportunityIn):
    id: int
    quotation_id: Optional[int] = None
    numero_oportunidad: Optional[str] = None
    file_manual_excel: Optional[str] = None
    file_manual_pdf: Optional[str] = None
    quotation_estado: Optional[str] = None   # estado de la cotización asociada
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=list[OpportunityOut])
def list_opportunities(
    business_line_id: Optional[int] = None,
    etapa: Optional[str] = None,
    probabilidad: Optional[str] = None,
    asesor: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    q = db.query(Opportunity)
    if business_line_id:
        q = q.filter(Opportunity.business_line_id == business_line_id)
    if etapa:
        q = q.filter(Opportunity.etapa == etapa)
    if probabilidad:
        q = q.filter(Opportunity.probabilidad == probabilidad)
    if asesor:
        q = q.filter(Opportunity.asesor.ilike(f"%{asesor}%"))
    opps = q.order_by(Opportunity.updated_at.desc()).offset(skip).limit(limit).all()

    # Enriquecer con estado de la cotización asociada
    from app.models.quotation import Quotation
    quote_ids = [o.quotation_id for o in opps if o.quotation_id]
    if quote_ids:
        estado_map = {
            qt.id: qt.estado
            for qt in db.query(Quotation).filter(Quotation.id.in_(quote_ids)).all()
        }
        for o in opps:
            o.quotation_estado = estado_map.get(o.quotation_id) if o.quotation_id else None
    return opps


@router.get("/{opp_id}", response_model=OpportunityOut)
def get_opportunity(opp_id: int, db: Session = Depends(get_db)):
    opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Oportunidad no encontrada")
    return opp


@router.post("", response_model=OpportunityOut, status_code=201)
def create_opportunity(data: OpportunityIn, db: Session = Depends(get_db)):
    opp = Opportunity(**data.model_dump())
    db.add(opp)
    db.commit()
    db.refresh(opp)
    return opp


@router.put("/{opp_id}", response_model=OpportunityOut)
def update_opportunity(opp_id: int, data: OpportunityIn, db: Session = Depends(get_db)):
    opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Oportunidad no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(opp, k, v)
    db.commit()
    db.refresh(opp)
    return opp


@router.delete("/{opp_id}", status_code=204)
def delete_opportunity(opp_id: int, db: Session = Depends(get_db)):
    opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Oportunidad no encontrada")

    # Eliminar cotización asociada (los ítems se borran en cascada por FK)
    if opp.quotation_id:
        from app.models.quotation import Quotation
        quot = db.query(Quotation).filter(Quotation.id == opp.quotation_id).first()
        if quot:
            opp.quotation_id = None   # romper referencia circular
            db.flush()
            db.delete(quot)
            db.flush()

    db.delete(opp)
    db.commit()


# ── Manual file upload ────────────────────────────────────────────────────────

@router.post("/{opp_id}/upload/excel")
async def upload_manual_excel(
    opp_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a manually-prepared Excel file for an opportunity."""
    opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Oportunidad no encontrada")

    from app.services.minio_service import MinioService
    from datetime import date as _date
    minio_svc = MinioService()
    content = await file.read()
    year_month = _date.today().strftime("%Y/%m")
    filename = f"{year_month}/opp_{opp_id}_manual.xlsx"
    path = minio_svc.upload(
        "quotations", filename, content,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    opp.file_manual_excel = path
    db.commit()
    return {"file_manual_excel": path}


@router.post("/{opp_id}/upload/pdf")
async def upload_manual_pdf(
    opp_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a manually-prepared PDF file for an opportunity."""
    opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Oportunidad no encontrada")

    from app.services.minio_service import MinioService
    from datetime import date as _date
    minio_svc = MinioService()
    content = await file.read()
    year_month = _date.today().strftime("%Y/%m")
    filename = f"{year_month}/opp_{opp_id}_manual.pdf"
    path = minio_svc.upload("quotations", filename, content, "application/pdf")
    opp.file_manual_pdf = path
    db.commit()
    return {"file_manual_pdf": path}


@router.get("/{opp_id}/download/excel")
def download_manual_excel(opp_id: int, db: Session = Depends(get_db)):
    opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opp or not opp.file_manual_excel:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    from app.services.minio_service import MinioService
    file_bytes = MinioService().download(opp.file_manual_excel)
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="propuesta_{opp_id}.xlsx"'},
    )


@router.get("/{opp_id}/download/pdf")
def download_manual_pdf(opp_id: int, db: Session = Depends(get_db)):
    opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opp or not opp.file_manual_pdf:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    from app.services.minio_service import MinioService
    file_bytes = MinioService().download(opp.file_manual_pdf)
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="propuesta_{opp_id}.pdf"'},
    )
