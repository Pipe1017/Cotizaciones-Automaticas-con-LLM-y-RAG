"""
Rellena el template de cotización OPEX con openpyxl.

Mapa de celdas del template cotizacion_base.xlsx:
  [6,  7]  G6  → Cliente (nombre del cliente)
  [11, 1]  A11 → Nº de cotización
  [11, 3]  C11 → Fecha
  [13, 7]  G13 → Persona contacto
  [18]     Row → Headers de ítems (ITEM/REF/DESC/SAP/MARCA/QTD/PRECIO)
  [20-21]  Rows → Ítems (max 2 en el template base)
    col 1  (A) = ITEM (número)
    col 3  (C) = REFERENCIA
    col 4  (D) = DESCRIPCION
    col 5  (E) = REF-COD PROVEEDOR
    col 9  (I) = MARCA
    col 12 (L) = QTD
    col 14 (N) = PRECIO UNITARIO
    col 15 (O) = PRECIO TOTAL
  [22, 15] O22 → SUBTOTAL
  [23, 15] O23 → IVA 19%
  [24, 15] O24 → TOTAL
  [29, 2]  B29 → OBSERVACIONES (texto)
  [41, 4]  D41 → Fecha entrega
  [43, 4]  D43 → Condiciones de entrega
  [45, 4]  D45 → Condiciones de pago
  [47, 4]  D47 → Condiciones garantía
  [49, 3]  C49 → Validez de la oferta
"""

from io import BytesIO
from datetime import date
from decimal import Decimal
import openpyxl


ITEM_START_ROW = 20
ITEM_END_ROW   = 21
MAX_ITEMS      = ITEM_END_ROW - ITEM_START_ROW + 1  # 2 ítems en el template base


def fill_template(template_bytes: bytes, data: dict) -> bytes:
    wb = openpyxl.load_workbook(BytesIO(template_bytes))
    ws = wb.active

    def cell(row, col, value):
        ws.cell(row=row, column=col, value=value)

    # ── Header ──────────────────────────────────────────────────
    cell(6,  7, data.get("cliente", ""))
    cell(11, 1, data.get("numero_cotizacion", ""))
    cell(11, 3, data.get("fecha", date.today()).strftime("%d/%m/%Y") if data.get("fecha") else "")
    cell(13, 7, data.get("contacto_nombre", ""))

    # ── Ítems ───────────────────────────────────────────────────
    items = data.get("items", [])[:MAX_ITEMS]
    for idx, item in enumerate(items):
        row = ITEM_START_ROW + idx
        cell(row, 1,  idx + 1)
        cell(row, 3,  item.get("referencia_usa", ""))
        cell(row, 4,  item.get("descripcion", ""))
        cell(row, 5,  item.get("referencia_cod_proveedor", ""))
        cell(row, 9,  item.get("marca", "HOPPECKE"))
        cell(row, 12, float(item.get("cantidad", 0)))
        cell(row, 14, float(item.get("precio_unitario_usd", 0)))
        cell(row, 15, float(item.get("precio_total_usd", 0)))

    # ── Totales ─────────────────────────────────────────────────
    subtotal = float(data.get("subtotal_usd", 0))
    iva_pct  = float(data.get("iva_pct", 19))
    cell(22, 15, subtotal)
    cell(23, 15, subtotal * iva_pct / 100)
    cell(24, 15, float(data.get("total_usd", 0)))

    # ── Condiciones comerciales ──────────────────────────────────
    cell(29, 2, data.get("observaciones", ""))
    cell(41, 4, data.get("fecha_entrega", ""))
    cell(43, 4, data.get("condiciones_entrega", ""))
    cell(45, 4, data.get("condiciones_pago", ""))
    cell(47, 4, data.get("condiciones_garantia", ""))
    cell(49, 3, data.get("validez_oferta", "30 días"))

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()
