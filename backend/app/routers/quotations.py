from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
import io

from app.database import get_db
from app.models.quotation import Quotation, QuotationItem
from app.models.company import Company
from app.services.quotation_service import QuotationService

router = APIRouter()

# ── City code mapping ────────────────────────────────────────────────────────
CITY_CODES = {
    "med": "Medellín", "bog": "Bogotá", "cal": "Cali",
    "bar": "Barranquilla", "buc": "Bucaramanga", "man": "Manizales",
    "per": "Pereira", "car": "Cartagena", "cuc": "Cúcuta",
}

# ── Business line codes 01-06 ────────────────────────────────────────────────
BL_CODES = {1: "01", 2: "02", 3: "03", 4: "04", 5: "05", 6: "06"}


def _next_quote_number(db: Session, ciudad: str, business_line_id: Optional[int]) -> str:
    """
    Format: YYMM-city-BL-NNNN
    Example: 2604-med-01-0003
    Uses a PostgreSQL sequence for global uniqueness across AI and manual quotes.
    """
    # Advance and read the global sequence
    result = db.execute(text("SELECT nextval('quote_global_seq')"))
    counter = result.scalar()

    yymm = datetime.now().strftime("%y%m")
    city = (ciudad or "med").lower()[:3]
    bl = BL_CODES.get(business_line_id, "00") if business_line_id else "00"

    return f"{yymm}-{city}-{bl}-{counter:04d}"


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class QuotationItemIn(BaseModel):
    referencia_usa: Optional[str] = None
    descripcion: str
    referencia_cod_proveedor: Optional[str] = None
    marca: Optional[str] = "HOPPECKE"
    cantidad: Decimal
    precio_unitario_usd: Decimal


class QuotationIn(BaseModel):
    company_id: Optional[int] = None
    opportunity_id: Optional[int] = None  # link to existing opp instead of creating new one
    business_line_id: Optional[int] = None
    ciudad_cotizacion: Optional[str] = "med"
    contacto_nombre: Optional[str] = None
    asesor: Optional[str] = "Aura María Gallego"
    iva_pct: Optional[Decimal] = Decimal("19.0")
    moneda: Optional[str] = "USD"
    tipo_cambio_eur: Optional[Decimal] = None
    observaciones: Optional[str] = None
    condiciones_entrega: Optional[str] = None
    condiciones_pago: Optional[str] = None
    condiciones_garantia: Optional[str] = None
    validez_oferta: Optional[str] = "30 días"
    fecha_entrega: Optional[str] = None
    titulo_oportunidad: Optional[str] = None  # for auto-creating opportunity
    # Campos internos de costeo (no aparecen en documentos)
    landed_pct: Optional[Decimal] = Decimal("0")
    margen_pct: Optional[Decimal] = Decimal("0")
    items: list[QuotationItemIn]


class GenerateQuotationIn(BaseModel):
    prompt: str
    company_id: Optional[int] = None
    opportunity_id: Optional[int] = None  # link to existing opp instead of creating new one
    business_line_id: Optional[int] = 1
    ciudad_cotizacion: Optional[str] = "med"
    contacto_nombre: Optional[str] = None
    asesor: Optional[str] = "Aura María Gallego"
    condiciones_pago: Optional[str] = None
    condiciones_entrega: Optional[str] = None
    condiciones_garantia: Optional[str] = None
    validez_oferta: Optional[str] = "30 días"
    # Campos internos de costeo (no aparecen en documentos)
    landed_pct: Optional[Decimal] = Decimal("0")
    margen_pct: Optional[Decimal] = Decimal("0")


class QuotationItemOut(BaseModel):
    id: int
    item_number: int
    referencia_usa: Optional[str]
    descripcion: str
    referencia_cod_proveedor: Optional[str]
    marca: Optional[str]
    cantidad: Decimal
    precio_unitario_usd: Decimal
    precio_total_usd: Decimal

    class Config:
        from_attributes = True


class QuotationOut(BaseModel):
    id: int
    numero_cotizacion: str
    fecha: date
    company_id: Optional[int]
    business_line_id: Optional[int]
    ciudad_cotizacion: Optional[str]
    contacto_nombre: Optional[str]
    asesor: Optional[str]
    subtotal_usd: Optional[Decimal]
    iva_pct: Optional[Decimal]
    total_usd: Optional[Decimal]
    estado: str
    version: int = 1
    parent_quotation_id: Optional[int] = None
    file_path_minio: Optional[str]
    file_path_carta: Optional[str]
    file_path_cotizacion: Optional[str]
    file_path_pdf: Optional[str]
    created_at: datetime
    opp_etapa: Optional[str] = None   # etapa de la oportunidad asociada

    class Config:
        from_attributes = True


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=list[QuotationOut])
def list_quotations(
    company_id: Optional[int] = None,
    estado: Optional[str] = None,
    business_line_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    from app.models.opportunity import Opportunity
    from sqlalchemy.orm import aliased
    q = db.query(Quotation)
    if company_id:
        q = q.filter(Quotation.company_id == company_id)
    if estado:
        q = q.filter(Quotation.estado == estado)
    if business_line_id:
        q = q.filter(Quotation.business_line_id == business_line_id)
    quotations = q.order_by(Quotation.created_at.desc()).offset(skip).limit(limit).all()

    # Enriquecer con etapa de la oportunidad asociada
    opp_map = {
        o.quotation_id: o.etapa
        for o in db.query(Opportunity).filter(
            Opportunity.quotation_id.in_([qt.id for qt in quotations])
        ).all()
    }
    for qt in quotations:
        qt.opp_etapa = opp_map.get(qt.id)
    return quotations


@router.get("/cities")
def list_cities():
    """Returns available city codes for quotation numbering."""
    return [{"code": k, "nombre": v} for k, v in CITY_CODES.items()]


@router.get("/catalog-check")
def catalog_check(db: Session = Depends(get_db)):
    """Verifica qué ve DeepSeek del catálogo de productos."""
    from app.models.product import Product
    products = db.query(Product).filter(Product.activo == True).all()
    con_precio = [p for p in products if p.precio_neto_usd]
    sin_precio  = [p for p in products if not p.precio_neto_usd]
    return {
        "resumen": {
            "total_productos": len(products),
            "con_precio_usd":  len(con_precio),
            "sin_precio_usd":  len(sin_precio),
        },
        "con_precio": [
            {"id": p.id, "modelo": p.modelo_hoppecke, "categoria": p.categoria,
             "precio_usd": float(p.precio_neto_usd)}
            for p in con_precio
        ],
        "sin_precio": [
            {"id": p.id, "modelo": p.modelo_hoppecke, "categoria": p.categoria}
            for p in sin_precio
        ],
    }


@router.get("/{quote_id}", response_model=QuotationOut)
def get_quotation(quote_id: int, db: Session = Depends(get_db)):
    q = db.query(Quotation).filter(Quotation.id == quote_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return q


@router.get("/{quote_id}/items", response_model=list[QuotationItemOut])
def get_quotation_items(quote_id: int, db: Session = Depends(get_db)):
    return (
        db.query(QuotationItem)
        .filter(QuotationItem.quotation_id == quote_id)
        .order_by(QuotationItem.item_number)
        .all()
    )


@router.post("", response_model=QuotationOut, status_code=201)
def create_quotation(data: QuotationIn, db: Session = Depends(get_db)):
    """Create a manual quotation. Applies landed/margen to item prices. Generates Excel + Word + PDF."""
    from app.services.word_service import generate_carta, generate_cotizacion
    from app.services.pdf_service import generate_pdf_from_words
    from app.services.minio_service import MinioService
    from app.services.excel_service import fill_template
    from app.config import settings

    # Apply landed + margen multiplier to item prices
    landed = float(data.landed_pct or 0)
    margen = float(data.margen_pct or 0)
    multiplier = (1 + landed / 100) * (1 + margen / 100)

    adjusted_items = []
    for item in data.items:
        adj_unit = item.precio_unitario_usd * Decimal(str(multiplier))
        adjusted_items.append({**item.model_dump(), "precio_unitario_usd": adj_unit})

    numero = _next_quote_number(db, data.ciudad_cotizacion or "med", data.business_line_id)
    subtotal = sum(
        Decimal(str(it["cantidad"])) * Decimal(str(it["precio_unitario_usd"]))
        for it in adjusted_items
    )
    iva = subtotal * (data.iva_pct / 100)
    total = subtotal + iva

    asesor = data.asesor or "Aura María Gallego"
    ciudad = data.ciudad_cotizacion or "med"

    # Get company name
    cliente_nombre = "Cliente"
    if data.company_id:
        from app.models.company import Company
        company = db.query(Company).filter(Company.id == data.company_id).first()
        if company:
            cliente_nombre = company.nombre

    # Get BL name
    bl_nombre = ""
    if data.business_line_id:
        from app.models.business_line import BusinessLine
        bl = db.query(BusinessLine).filter(BusinessLine.id == data.business_line_id).first()
        if bl:
            bl_nombre = bl.nombre

    quote = Quotation(
        numero_cotizacion=numero,
        fecha=date.today(),
        subtotal_usd=subtotal,
        iva_pct=data.iva_pct,
        total_usd=total,
        business_line_id=data.business_line_id,
        ciudad_cotizacion=ciudad,
        asesor=asesor,
        **{k: v for k, v in data.model_dump(
            exclude={"items", "titulo_oportunidad", "business_line_id",
                     "ciudad_cotizacion", "asesor", "landed_pct", "margen_pct"}
        ).items()},
    )
    db.add(quote)
    db.flush()

    for idx, item in enumerate(adjusted_items, start=1):
        db.add(
            QuotationItem(
                quotation_id=quote.id,
                item_number=idx,
                referencia_usa=item.get("referencia_usa"),
                descripcion=item["descripcion"],
                referencia_cod_proveedor=item.get("referencia_cod_proveedor"),
                marca=item.get("marca", "HOPPECKE"),
                cantidad=item["cantidad"],
                precio_unitario_usd=Decimal(str(item["precio_unitario_usd"])),
                precio_total_usd=Decimal(str(item["cantidad"])) * Decimal(str(item["precio_unitario_usd"])),
            )
        )

    # Link to existing opportunity or auto-create a new one
    # If the opportunity already has a quotation, auto-version the new one
    from app.models.opportunity import Opportunity
    from sqlalchemy import or_ as _or
    if data.opportunity_id:
        existing_opp = db.query(Opportunity).filter(Opportunity.id == data.opportunity_id).first()
        if existing_opp:
            if existing_opp.quotation_id:
                # Auto-version: find root and next version number
                prev = db.query(Quotation).filter(Quotation.id == existing_opp.quotation_id).first()
                if prev:
                    root_id = prev.parent_quotation_id or prev.id
                    max_v_row = db.query(Quotation).filter(
                        _or(Quotation.id == root_id, Quotation.parent_quotation_id == root_id)
                    ).order_by(Quotation.version.desc()).first()
                    next_v = (max_v_row.version if max_v_row else 1) + 1
                    base_num = numero.split("-V")[0]
                    numero = f"{base_num}-V{next_v}"
                    quote.numero_cotizacion = numero
                    quote.version = next_v
                    quote.parent_quotation_id = root_id
            existing_opp.quotation_id = quote.id
            existing_opp.numero_oportunidad = numero
            existing_opp.etapa = "Cotizacion"
            existing_opp.valor_usd = total
    else:
        titulo = data.titulo_oportunidad or f"Cotización {numero}"
        new_opp = Opportunity(
            company_id=data.company_id,
            business_line_id=data.business_line_id,
            titulo=titulo,
            valor_usd=total,
            etapa="Cotizacion",
            probabilidad="Probable",
            quotation_id=quote.id,
            numero_oportunidad=numero,
        )
        db.add(new_opp)

    db.commit()

    # Build shared document data
    items_for_docs = [
        {
            "item_number": i + 1,
            "referencia_usa": it.get("referencia_usa"),
            "descripcion": it["descripcion"],
            "referencia_cod_proveedor": it.get("referencia_cod_proveedor"),
            "marca": it.get("marca", "HOPPECKE"),
            "cantidad": float(it["cantidad"]),
            "precio_unitario_usd": float(it["precio_unitario_usd"]),
            "precio_total_usd": float(Decimal(str(it["cantidad"])) * Decimal(str(it["precio_unitario_usd"]))),
        }
        for i, it in enumerate(adjusted_items)
    ]
    year_month = date.today().strftime("%Y/%m")
    doc_data = {
        "cliente": cliente_nombre,
        "contacto_nombre": data.contacto_nombre or "",
        "numero_cotizacion": numero,
        "fecha": date.today(),
        "ciudad_cotizacion": ciudad,
        "asesor": asesor,
        "business_line_nombre": bl_nombre,
        "titulo_oportunidad": data.titulo_oportunidad or f"Cotización {numero}",
        "items": items_for_docs,
        "subtotal_usd": float(subtotal),
        "iva_pct": float(data.iva_pct),
        "total_usd": float(total),
        "observaciones": data.observaciones or "",
        "condiciones_pago": data.condiciones_pago or "",
        "condiciones_entrega": data.condiciones_entrega or "",
        "condiciones_garantia": data.condiciones_garantia or "",
        "validez_oferta": data.validez_oferta or "30 días",
        "fecha_entrega": data.fecha_entrega or "",
    }

    minio_svc = MinioService()

    # Excel
    try:
        template_bytes = minio_svc.get_template()
        excel_bytes = fill_template(template_bytes, doc_data)
        quote.file_path_minio = minio_svc.upload(
            settings.minio_bucket_quotations, f"{year_month}/{numero}.xlsx",
            excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except Exception as e:
        quote.observaciones = (quote.observaciones or "") + f"\n[Excel pendiente: {e}]"

    # Word carta
    carta_bytes = None
    try:
        carta_bytes = generate_carta(doc_data)
        quote.file_path_carta = minio_svc.upload(
            settings.minio_bucket_quotations, f"{year_month}/{numero}_carta.docx",
            carta_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
    except Exception as e:
        quote.observaciones = (quote.observaciones or "") + f"\n[Carta pendiente: {e}]"

    # Word cotización
    cot_bytes = None
    try:
        cot_bytes = generate_cotizacion(doc_data)
        quote.file_path_cotizacion = minio_svc.upload(
            settings.minio_bucket_quotations, f"{year_month}/{numero}_cotizacion.docx",
            cot_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
    except Exception as e:
        quote.observaciones = (quote.observaciones or "") + f"\n[Cotización Word pendiente: {e}]"

    # PDF combinado
    try:
        if carta_bytes and cot_bytes:
            pdf_bytes = generate_pdf_from_words(carta_bytes, cot_bytes)
            quote.file_path_pdf = minio_svc.upload(
                settings.minio_bucket_quotations, f"{year_month}/{numero}.pdf",
                pdf_bytes, "application/pdf",
            )
    except Exception as e:
        quote.observaciones = (quote.observaciones or "") + f"\n[PDF pendiente: {e}]"

    db.commit()
    db.refresh(quote)
    return quote



@router.post("/generate", response_model=QuotationOut, status_code=201)
async def generate_quotation(
    data: GenerateQuotationIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Genera una cotización usando DeepSeek AI a partir de texto libre."""
    service = QuotationService(db)
    try:
        quote = await service.generate(data)
        return quote
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando cotización: {str(e)}")


@router.get("/{quote_id}/download")
def download_quotation(quote_id: int, db: Session = Depends(get_db)):
    """Descarga el Excel de la cotización desde MinIO."""
    quote = db.query(Quotation).filter(Quotation.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    if not quote.file_path_minio:
        raise HTTPException(status_code=404, detail="Archivo no generado aún")

    from app.services.minio_service import MinioService
    minio_svc = MinioService()
    file_bytes = minio_svc.download(quote.file_path_minio)

    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{quote.numero_cotizacion}.xlsx"'},
    )


@router.get("/{quote_id}/download/pdf")
def download_quotation_pdf(quote_id: int, db: Session = Depends(get_db)):
    """Descarga el PDF combinado (carta + cotización) desde MinIO."""
    quote = db.query(Quotation).filter(Quotation.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    # Prefer stored combined PDF; fall back to generating on-the-fly from Words
    from app.services.minio_service import MinioService
    minio_svc = MinioService()

    if quote.file_path_pdf:
        pdf_bytes = minio_svc.download(quote.file_path_pdf)
    elif quote.file_path_carta and quote.file_path_cotizacion:
        from app.services.pdf_service import generate_pdf_from_words
        carta_bytes = minio_svc.download(quote.file_path_carta)
        cot_bytes   = minio_svc.download(quote.file_path_cotizacion)
        pdf_bytes   = generate_pdf_from_words(carta_bytes, cot_bytes)
    else:
        raise HTTPException(status_code=404, detail="PDF no generado aún")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{quote.numero_cotizacion}.pdf"'},
    )


@router.get("/{quote_id}/download/carta")
def download_carta(quote_id: int, db: Session = Depends(get_db)):
    """Descarga el Word de la carta de presentación."""
    quote = db.query(Quotation).filter(Quotation.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    if not quote.file_path_carta:
        raise HTTPException(status_code=404, detail="Carta no generada aún")
    from app.services.minio_service import MinioService
    file_bytes = MinioService().download(quote.file_path_carta)
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{quote.numero_cotizacion}_carta.docx"'},
    )


@router.get("/{quote_id}/download/cotizacion-word")
def download_cotizacion_word(quote_id: int, db: Session = Depends(get_db)):
    """Descarga el Word de la cotización."""
    quote = db.query(Quotation).filter(Quotation.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    if not quote.file_path_cotizacion:
        raise HTTPException(status_code=404, detail="Cotización Word no generada aún")
    from app.services.minio_service import MinioService
    file_bytes = MinioService().download(quote.file_path_cotizacion)
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{quote.numero_cotizacion}_cotizacion.docx"'},
    )


@router.get("/{quote_id}/download/pdf-combinado")
def download_pdf_combinado(quote_id: int, db: Session = Depends(get_db)):
    """Descarga el PDF combinado (carta + cotización)."""
    quote = db.query(Quotation).filter(Quotation.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    if not quote.file_path_pdf:
        raise HTTPException(status_code=404, detail="PDF no generado aún")
    from app.services.minio_service import MinioService
    file_bytes = MinioService().download(quote.file_path_pdf)
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{quote.numero_cotizacion}.pdf"'},
    )


class QuotationEditIn(BaseModel):
    """Used for both editing existing quote and creating new version."""
    contacto_nombre: Optional[str] = None
    asesor: Optional[str] = None
    condiciones_pago: Optional[str] = None
    condiciones_entrega: Optional[str] = None
    condiciones_garantia: Optional[str] = None
    validez_oferta: Optional[str] = "30 días"
    fecha_entrega: Optional[str] = None
    observaciones: Optional[str] = None
    iva_pct: Optional[Decimal] = Decimal("19.0")
    landed_pct: Optional[Decimal] = Decimal("0")
    margen_pct: Optional[Decimal] = Decimal("0")
    items: list[QuotationItemIn]


def _build_docs_and_files(quote: "Quotation", items_for_docs: list, doc_data: dict, db: Session) -> None:
    """Generates Excel, Word carta, Word cotización, PDF and uploads to MinIO."""
    from app.services.word_service import generate_carta, generate_cotizacion
    from app.services.pdf_service import generate_pdf_from_words
    from app.services.minio_service import MinioService
    from app.services.excel_service import fill_template
    from app.config import settings

    minio_svc = MinioService()
    numero = quote.numero_cotizacion
    year_month = date.today().strftime("%Y/%m")

    # Excel
    try:
        template_bytes = minio_svc.get_template()
        excel_bytes = fill_template(template_bytes, {**doc_data, "items": items_for_docs})
        quote.file_path_minio = minio_svc.upload(
            settings.minio_bucket_quotations, f"{year_month}/{numero}.xlsx",
            excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except Exception as e:
        quote.observaciones = (quote.observaciones or "") + f"\n[Excel pendiente: {e}]"

    carta_bytes = cot_bytes = None
    try:
        carta_bytes = generate_carta({**doc_data, "items": items_for_docs})
        quote.file_path_carta = minio_svc.upload(
            settings.minio_bucket_quotations, f"{year_month}/{numero}_carta.docx",
            carta_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
    except Exception as e:
        quote.observaciones = (quote.observaciones or "") + f"\n[Carta pendiente: {e}]"

    try:
        cot_bytes = generate_cotizacion({**doc_data, "items": items_for_docs})
        quote.file_path_cotizacion = minio_svc.upload(
            settings.minio_bucket_quotations, f"{year_month}/{numero}_cotizacion.docx",
            cot_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
    except Exception as e:
        quote.observaciones = (quote.observaciones or "") + f"\n[Cotización Word pendiente: {e}]"

    try:
        if carta_bytes and cot_bytes:
            pdf_bytes = generate_pdf_from_words(carta_bytes, cot_bytes)
            quote.file_path_pdf = minio_svc.upload(
                settings.minio_bucket_quotations, f"{year_month}/{numero}.pdf",
                pdf_bytes, "application/pdf",
            )
    except Exception as e:
        quote.observaciones = (quote.observaciones or "") + f"\n[PDF pendiente: {e}]"


@router.put("/{quote_id}", response_model=QuotationOut)
def edit_quotation(quote_id: int, data: QuotationEditIn, db: Session = Depends(get_db)):
    """Edit an existing quotation in-place: updates items, recalculates totals, regenerates all files."""
    quote = db.query(Quotation).filter(Quotation.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    landed = float(data.landed_pct or 0)
    margen = float(data.margen_pct or 0)
    multiplier = (1 + landed / 100) * (1 + margen / 100)

    adjusted_items = []
    for item in data.items:
        adj_unit = item.precio_unitario_usd * Decimal(str(multiplier))
        adjusted_items.append({**item.model_dump(), "precio_unitario_usd": adj_unit})

    subtotal = sum(
        Decimal(str(it["cantidad"])) * Decimal(str(it["precio_unitario_usd"]))
        for it in adjusted_items
    )
    iva = subtotal * (data.iva_pct / 100)
    total = subtotal + iva

    # Update quote fields
    quote.subtotal_usd = subtotal
    quote.iva_pct = data.iva_pct
    quote.total_usd = total
    quote.contacto_nombre = data.contacto_nombre or quote.contacto_nombre
    quote.asesor = data.asesor or quote.asesor
    quote.condiciones_pago = data.condiciones_pago or quote.condiciones_pago
    quote.condiciones_entrega = data.condiciones_entrega or quote.condiciones_entrega
    quote.condiciones_garantia = data.condiciones_garantia or quote.condiciones_garantia
    quote.validez_oferta = data.validez_oferta or quote.validez_oferta
    quote.fecha_entrega = data.fecha_entrega or quote.fecha_entrega
    if data.observaciones is not None:
        quote.observaciones = data.observaciones

    # Replace items
    db.query(QuotationItem).filter(QuotationItem.quotation_id == quote_id).delete()
    for idx, item in enumerate(adjusted_items, start=1):
        db.add(QuotationItem(
            quotation_id=quote.id, item_number=idx,
            referencia_usa=item.get("referencia_usa"),
            descripcion=item["descripcion"],
            referencia_cod_proveedor=item.get("referencia_cod_proveedor"),
            marca=item.get("marca", "HOPPECKE"),
            cantidad=item["cantidad"],
            precio_unitario_usd=Decimal(str(item["precio_unitario_usd"])),
            precio_total_usd=Decimal(str(item["cantidad"])) * Decimal(str(item["precio_unitario_usd"])),
        ))

    # Update linked opportunity value
    from app.models.opportunity import Opportunity
    opp = db.query(Opportunity).filter(Opportunity.quotation_id == quote_id).first()
    if opp:
        opp.valor_usd = total

    db.commit()

    # Rebuild doc_data
    cliente_nombre = "Cliente"
    if quote.company_id:
        from app.models.company import Company
        company = db.query(Company).filter(Company.id == quote.company_id).first()
        if company:
            cliente_nombre = company.nombre

    bl_nombre = ""
    if quote.business_line_id:
        from app.models.business_line import BusinessLine
        bl = db.query(BusinessLine).filter(BusinessLine.id == quote.business_line_id).first()
        if bl:
            bl_nombre = bl.nombre

    items_for_docs = [
        {
            "item_number": i + 1,
            "referencia_usa": it.get("referencia_usa"),
            "descripcion": it["descripcion"],
            "referencia_cod_proveedor": it.get("referencia_cod_proveedor"),
            "marca": it.get("marca", "HOPPECKE"),
            "cantidad": float(it["cantidad"]),
            "precio_unitario_usd": float(it["precio_unitario_usd"]),
            "precio_total_usd": float(Decimal(str(it["cantidad"])) * Decimal(str(it["precio_unitario_usd"]))),
        }
        for i, it in enumerate(adjusted_items)
    ]

    doc_data = {
        "cliente": cliente_nombre,
        "contacto_nombre": quote.contacto_nombre or "",
        "numero_cotizacion": quote.numero_cotizacion,
        "fecha": quote.fecha,
        "ciudad_cotizacion": quote.ciudad_cotizacion or "med",
        "asesor": quote.asesor or "Aura María Gallego",
        "business_line_nombre": bl_nombre,
        "titulo_oportunidad": f"Cotización {quote.numero_cotizacion}",
        "subtotal_usd": float(subtotal),
        "iva_pct": float(data.iva_pct),
        "total_usd": float(total),
        "observaciones": quote.observaciones or "",
        "condiciones_pago": quote.condiciones_pago or "",
        "condiciones_entrega": quote.condiciones_entrega or "",
        "condiciones_garantia": quote.condiciones_garantia or "",
        "validez_oferta": quote.validez_oferta or "30 días",
        "fecha_entrega": quote.fecha_entrega or "",
    }

    _build_docs_and_files(quote, items_for_docs, doc_data, db)
    db.commit()
    db.refresh(quote)
    return quote


@router.post("/{quote_id}/new-version", response_model=QuotationOut, status_code=201)
def new_version(quote_id: int, data: QuotationEditIn, db: Session = Depends(get_db)):
    """Create a new version of an existing quotation (V2, V3...). Relinks the opportunity."""
    original = db.query(Quotation).filter(Quotation.id == quote_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    # Determine the root parent and next version number
    root_id = original.parent_quotation_id or original.id
    # Find highest version with this root (or this quote as root)
    from sqlalchemy import or_
    max_v = db.query(Quotation).filter(
        or_(Quotation.id == root_id, Quotation.parent_quotation_id == root_id)
    ).order_by(Quotation.version.desc()).first()
    next_version = (max_v.version if max_v else 1) + 1

    # Strip any existing -V suffix from numero and append new version
    base_numero = original.numero_cotizacion.split("-V")[0]
    new_numero = f"{base_numero}-V{next_version}"

    landed = float(data.landed_pct or 0)
    margen = float(data.margen_pct or 0)
    multiplier = (1 + landed / 100) * (1 + margen / 100)

    adjusted_items = []
    for item in data.items:
        adj_unit = item.precio_unitario_usd * Decimal(str(multiplier))
        adjusted_items.append({**item.model_dump(), "precio_unitario_usd": adj_unit})

    subtotal = sum(
        Decimal(str(it["cantidad"])) * Decimal(str(it["precio_unitario_usd"]))
        for it in adjusted_items
    )
    iva = subtotal * (data.iva_pct / 100)
    total = subtotal + iva

    new_quote = Quotation(
        numero_cotizacion=new_numero,
        fecha=date.today(),
        company_id=original.company_id,
        business_line_id=original.business_line_id,
        ciudad_cotizacion=original.ciudad_cotizacion,
        contacto_nombre=data.contacto_nombre or original.contacto_nombre,
        asesor=data.asesor or original.asesor,
        subtotal_usd=subtotal,
        iva_pct=data.iva_pct,
        total_usd=total,
        moneda=original.moneda,
        condiciones_pago=data.condiciones_pago or original.condiciones_pago,
        condiciones_entrega=data.condiciones_entrega or original.condiciones_entrega,
        condiciones_garantia=data.condiciones_garantia or original.condiciones_garantia,
        validez_oferta=data.validez_oferta or original.validez_oferta,
        fecha_entrega=data.fecha_entrega or original.fecha_entrega,
        observaciones=data.observaciones,
        estado="borrador",
        version=next_version,
        parent_quotation_id=root_id,
    )
    db.add(new_quote)
    db.flush()

    for idx, item in enumerate(adjusted_items, start=1):
        db.add(QuotationItem(
            quotation_id=new_quote.id, item_number=idx,
            referencia_usa=item.get("referencia_usa"),
            descripcion=item["descripcion"],
            referencia_cod_proveedor=item.get("referencia_cod_proveedor"),
            marca=item.get("marca", "HOPPECKE"),
            cantidad=item["cantidad"],
            precio_unitario_usd=Decimal(str(item["precio_unitario_usd"])),
            precio_total_usd=Decimal(str(item["cantidad"])) * Decimal(str(item["precio_unitario_usd"])),
        ))

    # Relink the opportunity to the new version
    from app.models.opportunity import Opportunity
    opp = db.query(Opportunity).filter(Opportunity.quotation_id == quote_id).first()
    if opp:
        opp.quotation_id = new_quote.id
        opp.numero_oportunidad = new_numero
        opp.valor_usd = total

    db.commit()

    # Build doc_data for file generation
    cliente_nombre = "Cliente"
    if new_quote.company_id:
        from app.models.company import Company
        company = db.query(Company).filter(Company.id == new_quote.company_id).first()
        if company:
            cliente_nombre = company.nombre

    bl_nombre = ""
    if new_quote.business_line_id:
        from app.models.business_line import BusinessLine
        bl = db.query(BusinessLine).filter(BusinessLine.id == new_quote.business_line_id).first()
        if bl:
            bl_nombre = bl.nombre

    items_for_docs = [
        {
            "item_number": i + 1,
            "referencia_usa": it.get("referencia_usa"),
            "descripcion": it["descripcion"],
            "referencia_cod_proveedor": it.get("referencia_cod_proveedor"),
            "marca": it.get("marca", "HOPPECKE"),
            "cantidad": float(it["cantidad"]),
            "precio_unitario_usd": float(it["precio_unitario_usd"]),
            "precio_total_usd": float(Decimal(str(it["cantidad"])) * Decimal(str(it["precio_unitario_usd"]))),
        }
        for i, it in enumerate(adjusted_items)
    ]

    doc_data = {
        "cliente": cliente_nombre,
        "contacto_nombre": new_quote.contacto_nombre or "",
        "numero_cotizacion": new_numero,
        "fecha": new_quote.fecha,
        "ciudad_cotizacion": new_quote.ciudad_cotizacion or "med",
        "asesor": new_quote.asesor or "Aura María Gallego",
        "business_line_nombre": bl_nombre,
        "titulo_oportunidad": f"Cotización {new_numero}",
        "subtotal_usd": float(subtotal),
        "iva_pct": float(data.iva_pct),
        "total_usd": float(total),
        "observaciones": new_quote.observaciones or "",
        "condiciones_pago": new_quote.condiciones_pago or "",
        "condiciones_entrega": new_quote.condiciones_entrega or "",
        "condiciones_garantia": new_quote.condiciones_garantia or "",
        "validez_oferta": new_quote.validez_oferta or "30 días",
        "fecha_entrega": new_quote.fecha_entrega or "",
    }

    _build_docs_and_files(new_quote, items_for_docs, doc_data, db)
    db.commit()
    db.refresh(new_quote)
    return new_quote


@router.delete("/{quote_id}", status_code=204)
def delete_quotation(quote_id: int, db: Session = Depends(get_db)):
    quote = db.query(Quotation).filter(Quotation.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    # Desvincular oportunidad si existe
    if quote.opportunity_id:
        from app.models.opportunity import Opportunity
        opp = db.query(Opportunity).filter(Opportunity.id == quote.opportunity_id).first()
        if opp:
            opp.quotation_id = None
            db.flush()
    # Los ítems se borran en cascada (ondelete=CASCADE)
    db.delete(quote)
    db.commit()


@router.patch("/{quote_id}/status")
def update_status(quote_id: int, estado: str, db: Session = Depends(get_db)):
    allowed = {"borrador", "enviada"}
    if estado not in allowed:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Opciones: {allowed}")
    quote = db.query(Quotation).filter(Quotation.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    quote.estado = estado
    db.commit()
    return {"id": quote_id, "estado": estado}
