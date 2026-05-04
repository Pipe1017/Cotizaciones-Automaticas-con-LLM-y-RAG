from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import datetime

from app.database import get_db
from app.models.product import Product

router = APIRouter()


class ProductOut(BaseModel):
    id: int
    business_line_id: Optional[int]
    voltaje: Optional[str]
    referencia_usa: Optional[str]
    tipo_conector: Optional[str]
    modelo_hoppecke: Optional[str]
    codigo_sap: Optional[str]
    capacidad_ah: Optional[Decimal]
    kwh: Optional[Decimal]
    peso_kg: Optional[Decimal]
    largo_mm: Optional[Decimal]
    ancho_mm: Optional[Decimal]
    altura_mm: Optional[Decimal]
    precio_neto_eur: Optional[Decimal]
    precio_neto_usd: Optional[Decimal]
    activo: bool
    categoria: Optional[str]
    tecnologia: Optional[str]
    descripcion_comercial: Optional[str]
    unidad: Optional[str]
    proveedor_id: Optional[int]
    datasheet_path: Optional[str]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ProductIn(BaseModel):
    business_line_id: int
    modelo_hoppecke: str
    referencia_usa: Optional[str] = None
    descripcion_comercial: Optional[str] = None
    tipo_conector: Optional[str] = None
    codigo_sap: Optional[str] = None
    voltaje: Optional[str] = None
    capacidad_ah: Optional[Decimal] = None
    kwh: Optional[Decimal] = None
    peso_kg: Optional[Decimal] = None
    largo_mm: Optional[Decimal] = None
    ancho_mm: Optional[Decimal] = None
    altura_mm: Optional[Decimal] = None
    precio_neto_eur: Optional[Decimal] = None
    precio_neto_usd: Optional[Decimal] = None
    tecnologia: Optional[str] = None
    unidad: Optional[str] = "unidad"
    categoria: Optional[str] = None
    proveedor_id: Optional[int] = None


class ProductPriceUpdate(BaseModel):
    precio_neto_eur: Optional[Decimal] = None
    precio_neto_usd: Optional[Decimal] = None


@router.get("", response_model=list[ProductOut])
def list_products(
    voltaje: Optional[str] = None,
    search: Optional[str] = None,
    business_line_id: Optional[int] = None,
    categoria: Optional[str] = None,
    proveedor_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 300,
    db: Session = Depends(get_db),
):
    q = db.query(Product).filter(Product.activo == True)
    if voltaje:
        q = q.filter(Product.voltaje == voltaje)
    if business_line_id:
        q = q.filter(Product.business_line_id == business_line_id)
    if categoria:
        q = q.filter(Product.categoria == categoria)
    if proveedor_id:
        q = q.filter(Product.proveedor_id == proveedor_id)
    if search:
        term = f"%{search}%"
        q = q.filter(
            Product.modelo_hoppecke.ilike(term) |
            Product.referencia_usa.ilike(term) |
            Product.descripcion_comercial.ilike(term)
        )
    return q.order_by(Product.business_line_id, Product.categoria, Product.modelo_hoppecke).offset(skip).limit(limit).all()


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return p


@router.post("", response_model=ProductOut, status_code=201)
def create_product(data: ProductIn, db: Session = Depends(get_db)):
    if not data.categoria:
        cat_map = {1: "traccion", 2: "estacionaria", 3: "movilidad",
                   4: "gases", 5: "fertilizantes", 6: "hidrogeno"}
        categoria = cat_map.get(data.business_line_id, "otro")
    else:
        categoria = data.categoria
    p = Product(**{**data.model_dump(), "categoria": categoria})
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, data: ProductIn, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.patch("/{product_id}/price", response_model=ProductOut)
def update_price(product_id: int, data: ProductPriceUpdate, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if data.precio_neto_eur is not None:
        p.precio_neto_eur = data.precio_neto_eur
    if data.precio_neto_usd is not None:
        p.precio_neto_usd = data.precio_neto_usd
    db.commit()
    db.refresh(p)
    return p


@router.post("/{product_id}/datasheet", response_model=ProductOut)
async def upload_datasheet(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    from app.services.minio_service import MinioService
    from app.config import settings

    content = await file.read()
    minio = MinioService()
    path = minio.upload(
        "products",
        f"datasheets/{product_id}/{file.filename}",
        content,
        file.content_type or "application/octet-stream",
    )
    p.datasheet_path = path
    db.commit()
    db.refresh(p)
    return p


@router.get("/{product_id}/datasheet")
def download_datasheet(product_id: int, db: Session = Depends(get_db)):
    from fastapi.responses import StreamingResponse
    import io
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p or not p.datasheet_path:
        raise HTTPException(status_code=404, detail="Datasheet no disponible")
    from app.services.minio_service import MinioService
    minio = MinioService()
    # datasheet_path se almacena como "products/datasheets/{id}/{filename}"
    data = minio.download(p.datasheet_path)
    filename = p.datasheet_path.split("/")[-1]
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    p.activo = False
    db.commit()
