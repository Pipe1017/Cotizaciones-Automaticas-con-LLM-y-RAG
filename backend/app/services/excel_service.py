"""
Rellena el template de cotización OPEX con openpyxl.

Mapa de celdas del template (fila, columna — 1-indexed):
  [6, 7]   → Cliente
  [9, 2]   → Nº de cotización
  [9, 5]   → Fecha
  [12, 8]  → Persona contacto
  [17-21]  → Filas de ítems (hasta 5 ítems)
    col 2  = ITEM (número)
    col 3  = REFERENCIA
    col 4  = DESCRIPCION
    col 8  = REF-COD PROVEEDOR
    col 11 = MARCA
    col 13 = QTD
    col 14 = PRECIO UNITARIO
    col 15 = PRECIO TOTAL
  [22, 15] → SUBTOTAL
  [23, 15] → IVA 19%
  [24, 15] → TOTAL
  [28, 3]  → OBSERVACIONES
  [40, 3]  → Fecha entrega
  [42, 3]  → Condiciones de entrega
  [44, 3]  → Condiciones de pago
  [46, 3]  → Condiciones garantía
  [48, 3]  → Validez de la oferta
"""

from io import BytesIO
from datetime import date
from decimal import Decimal
import openpyxl


ITEM_START_ROW = 17
ITEM_END_ROW = 21
MAX_ITEMS = ITEM_END_ROW - ITEM_START_ROW + 1


def fill_template(template_bytes: bytes, data: dict) -> bytes:
    """
    data = {
        "cliente": str,
        "numero_cotizacion": str,
        "fecha": date,
        "contacto_nombre": str,
        "items": [{"referencia_usa", "descripcion", "referencia_cod_proveedor",
                   "marca", "cantidad", "precio_unitario_usd", "precio_total_usd"}],
        "subtotal_usd": Decimal,
        "iva_pct": Decimal,
        "total_usd": Decimal,
        "observaciones": str,
        "fecha_entrega": str,
        "condiciones_entrega": str,
        "condiciones_pago": str,
        "condiciones_garantia": str,
        "validez_oferta": str,
    }
    """
    wb = openpyxl.load_workbook(BytesIO(template_bytes))
    ws = wb.active

    def cell(row, col, value):
        ws.cell(row=row, column=col, value=value)

    # Header
    cell(6, 7, data.get("cliente", ""))
    cell(9, 2, data.get("numero_cotizacion", ""))
    cell(9, 5, data.get("fecha", date.today()).strftime("%d/%m/%Y") if data.get("fecha") else "")
    cell(12, 8, data.get("contacto_nombre", ""))

    # Line items
    items = data.get("items", [])[:MAX_ITEMS]
    for idx, item in enumerate(items):
        row = ITEM_START_ROW + idx
        cell(row, 2, idx + 1)
        cell(row, 3, item.get("referencia_usa", ""))
        cell(row, 4, item.get("descripcion", ""))
        cell(row, 8, item.get("referencia_cod_proveedor", ""))
        cell(row, 11, item.get("marca", "HOPPECKE"))
        cell(row, 13, float(item.get("cantidad", 0)))
        cell(row, 14, float(item.get("precio_unitario_usd", 0)))
        cell(row, 15, float(item.get("precio_total_usd", 0)))

    # Totals
    cell(22, 15, float(data.get("subtotal_usd", 0)))
    cell(23, 15, float(data.get("subtotal_usd", 0)) * float(data.get("iva_pct", 19)) / 100)
    cell(24, 15, float(data.get("total_usd", 0)))

    # Commercial conditions
    cell(28, 3, data.get("observaciones", ""))
    cell(40, 3, data.get("fecha_entrega", ""))
    cell(42, 3, data.get("condiciones_entrega", ""))
    cell(44, 3, data.get("condiciones_pago", ""))
    cell(46, 3, data.get("condiciones_garantia", ""))
    cell(48, 3, data.get("validez_oferta", "30 días"))

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()
