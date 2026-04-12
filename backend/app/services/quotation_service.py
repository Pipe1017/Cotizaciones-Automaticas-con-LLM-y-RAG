import json
from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.models.quotation import Quotation, QuotationItem
from app.models.product import Product
from app.services.deepseek_service import generate_quotation_items
from app.services.excel_service import fill_template
from app.services.minio_service import MinioService
from app.services.word_service import generate_carta, generate_cotizacion
from app.services.pdf_service import generate_pdf_from_words

BL_CODES = {1: "01", 2: "02", 3: "03", 4: "04", 5: "05", 6: "06"}


class QuotationService:
    def __init__(self, db: Session):
        self.db = db
        self.minio = MinioService()

    def _next_number(self, ciudad: str, business_line_id: int | None) -> str:
        """
        Format: YYMM-city-BL-NNNN  e.g.  2604-med-01-0003
        Uses a global PostgreSQL sequence for atomicity across AI and manual quotes.
        """
        result = self.db.execute(text("SELECT nextval('quote_global_seq')"))
        counter = result.scalar()

        from datetime import datetime
        yymm = datetime.now().strftime("%y%m")
        city = (ciudad or "med").lower()[:3]
        bl = BL_CODES.get(business_line_id, "00") if business_line_id else "00"

        return f"{yymm}-{city}-{bl}-{counter:04d}"

    def _catalog_json(self, landed_pct: float = 0, margen_pct: float = 0) -> str:
        """
        Devuelve el catálogo con precios ya ajustados por % landed + % margen.
        precio_venta = precio_catalogo × (1 + landed/100) × (1 + margen/100)
        """
        products = self.db.query(Product).filter(Product.activo == True).all()
        multiplier = (1 + landed_pct / 100) * (1 + margen_pct / 100)
        catalog = [
            {
                "id": p.id,
                "categoria": p.categoria or "traccion",
                "tecnologia": p.tecnologia,
                "voltaje": p.voltaje,
                "referencia_usa": p.referencia_usa,
                "tipo_conector": p.tipo_conector,
                "modelo_hoppecke": p.modelo_hoppecke,
                "codigo_sap": p.codigo_sap,
                "capacidad_ah": float(p.capacidad_ah) if p.capacidad_ah else None,
                "kwh": float(p.kwh) if p.kwh else None,
                "peso_kg": float(p.peso_kg) if p.peso_kg else None,
                "largo_mm": float(p.largo_mm) if p.largo_mm else None,
                "ancho_mm": float(p.ancho_mm) if p.ancho_mm else None,
                "altura_mm": float(p.altura_mm) if p.altura_mm else None,
                # Precio ajustado (interno — no se expone en documentos de cotización)
                "precio_neto_usd": round(float(p.precio_neto_usd) * multiplier, 2)
                    if p.precio_neto_usd else None,
            }
            for p in products
        ]
        return json.dumps(catalog, ensure_ascii=False)

    async def generate(self, data) -> Quotation:
        # 1. Call DeepSeek with prices adjusted by landed/margen from the opportunity
        landed = float(getattr(data, 'landed_pct', 0) or 0)
        margen = float(getattr(data, 'margen_pct', 0) or 0)
        catalog_json = self._catalog_json(landed_pct=landed, margen_pct=margen)
        ai_result = await generate_quotation_items(data.prompt, catalog_json)

        ai_items = ai_result.get("items", [])
        if not ai_items:
            raise ValueError("DeepSeek no retornó ítems de cotización")

        # 2. Calculate totals
        subtotal = Decimal("0")
        for item in ai_items:
            total_item = Decimal(str(item.get("cantidad", 1))) * Decimal(str(item.get("precio_unitario_usd", 0)))
            item["precio_total_usd"] = float(total_item)
            subtotal += total_item

        iva_pct = Decimal("19.0")
        iva = subtotal * iva_pct / 100
        total = subtotal + iva

        # 3. Get company name
        cliente_nombre = "Cliente"
        if data.company_id:
            from app.models.company import Company
            company = self.db.query(Company).filter(Company.id == data.company_id).first()
            if company:
                cliente_nombre = company.nombre

        # 4. Determine business_line_id (use provided or try to detect from items)
        bl_id = getattr(data, "business_line_id", 1) or 1
        ciudad = getattr(data, "ciudad_cotizacion", "med") or "med"

        # 5. Persist quotation with new number format
        asesor = getattr(data, 'asesor', None) or "Aura María Gallego"
        numero = self._next_number(ciudad, bl_id)
        quote = Quotation(
            numero_cotizacion=numero,
            fecha=date.today(),
            company_id=data.company_id,
            business_line_id=bl_id,
            ciudad_cotizacion=ciudad,
            contacto_nombre=data.contacto_nombre,
            asesor=asesor,
            subtotal_usd=subtotal,
            iva_pct=iva_pct,
            total_usd=total,
            condiciones_pago=data.condiciones_pago or ai_result.get("condiciones_pago"),
            condiciones_entrega=data.condiciones_entrega or ai_result.get("condiciones_entrega"),
            condiciones_garantia=data.condiciones_garantia or ai_result.get("condiciones_garantia"),
            validez_oferta=data.validez_oferta or ai_result.get("validez_oferta", "30 días"),
            observaciones=ai_result.get("observaciones"),
            estado="borrador",
        )
        self.db.add(quote)
        self.db.flush()

        for idx, item in enumerate(ai_items, start=1):
            self.db.add(
                QuotationItem(
                    quotation_id=quote.id,
                    item_number=idx,
                    referencia_usa=item.get("referencia_usa"),
                    descripcion=item.get("descripcion", ""),
                    referencia_cod_proveedor=item.get("referencia_cod_proveedor"),
                    marca=item.get("marca", "HOPPECKE"),
                    cantidad=Decimal(str(item.get("cantidad", 1))),
                    precio_unitario_usd=Decimal(str(item.get("precio_unitario_usd", 0))),
                    precio_total_usd=Decimal(str(item.get("precio_total_usd", 0))),
                )
            )

        # 6. Link to existing opportunity or auto-create a new one
        from app.models.opportunity import Opportunity
        from sqlalchemy import or_ as _or
        opp_id = getattr(data, 'opportunity_id', None)
        if opp_id:
            existing_opp = self.db.query(Opportunity).filter(Opportunity.id == opp_id).first()
            if existing_opp:
                if existing_opp.quotation_id:
                    # Auto-version: detect previous quote and increment version
                    from app.models.quotation import Quotation as _Q
                    prev = self.db.query(_Q).filter(_Q.id == existing_opp.quotation_id).first()
                    if prev:
                        root_id = prev.parent_quotation_id or prev.id
                        max_v_row = self.db.query(_Q).filter(
                            _or(_Q.id == root_id, _Q.parent_quotation_id == root_id)
                        ).order_by(_Q.version.desc()).first()
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
            titulo = f"Cot. {numero} — {cliente_nombre}"
            new_opp = Opportunity(
                company_id=data.company_id,
                business_line_id=bl_id,
                titulo=titulo,
                valor_usd=total,
                etapa="Cotizacion",
                probabilidad="Probable",
                quotation_id=quote.id,
                numero_oportunidad=numero,
            )
            self.db.add(new_opp)

        # 7. Build shared document data
        year_month = date.today().strftime("%Y/%m")
        doc_data = {
            "cliente": cliente_nombre,
            "contacto_nombre": data.contacto_nombre or "",
            "numero_cotizacion": numero,
            "fecha": date.today(),
            "ciudad_cotizacion": ciudad,
            "asesor": asesor,
            "business_line_nombre": self._bl_nombre(bl_id),
            "titulo_oportunidad": getattr(data, 'titulo_oportunidad', None) or f"Cot. {numero}",
            "items": ai_items,
            "subtotal_usd": float(subtotal),
            "iva_pct": float(iva_pct),
            "total_usd": float(total),
            "observaciones": ai_result.get("observaciones", ""),
            "condiciones_pago": data.condiciones_pago or ai_result.get("condiciones_pago", ""),
            "condiciones_entrega": data.condiciones_entrega or ai_result.get("condiciones_entrega", ""),
            "condiciones_garantia": data.condiciones_garantia or ai_result.get("condiciones_garantia", ""),
            "validez_oferta": data.validez_oferta or ai_result.get("validez_oferta", "30 días"),
        }

        # 8. Excel
        try:
            template_bytes = self.minio.get_template()
            excel_bytes = fill_template(template_bytes, doc_data)
            quote.file_path_minio = self.minio.upload(
                settings.minio_bucket_quotations,
                f"{year_month}/{numero}.xlsx",
                excel_bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        except Exception as e:
            quote.observaciones = (quote.observaciones or "") + f"\n[Excel pendiente: {str(e)}]"

        # 9. Word carta
        try:
            carta_bytes = generate_carta(doc_data)
            quote.file_path_carta = self.minio.upload(
                settings.minio_bucket_quotations,
                f"{year_month}/{numero}_carta.docx",
                carta_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        except Exception as e:
            quote.observaciones = (quote.observaciones or "") + f"\n[Carta pendiente: {str(e)}]"

        # 10. Word cotización
        try:
            cot_bytes = generate_cotizacion(doc_data)
            quote.file_path_cotizacion = self.minio.upload(
                settings.minio_bucket_quotations,
                f"{year_month}/{numero}_cotizacion.docx",
                cot_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        except Exception as e:
            quote.observaciones = (quote.observaciones or "") + f"\n[Cotización Word pendiente: {str(e)}]"

        # 11. PDF combinado (carta + cotización vía LibreOffice)
        try:
            if not carta_bytes:
                carta_bytes = generate_carta(doc_data)
            if not cot_bytes:
                cot_bytes = generate_cotizacion(doc_data)
            pdf_bytes = generate_pdf_from_words(carta_bytes, cot_bytes)
            quote.file_path_pdf = self.minio.upload(
                settings.minio_bucket_quotations,
                f"{year_month}/{numero}.pdf",
                pdf_bytes,
                "application/pdf",
            )
        except Exception as e:
            quote.observaciones = (quote.observaciones or "") + f"\n[PDF pendiente: {str(e)}]"

        self.db.commit()
        self.db.refresh(quote)
        return quote

    def _bl_nombre(self, bl_id: int) -> str:
        from app.models.business_line import BusinessLine
        bl = self.db.query(BusinessLine).filter(BusinessLine.id == bl_id).first()
        return bl.nombre if bl else ""
