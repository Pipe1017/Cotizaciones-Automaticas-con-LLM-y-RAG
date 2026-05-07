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
import zipfile


ITEM_START_ROW = 20
ITEM_END_ROW   = 21
MAX_ITEMS      = ITEM_END_ROW - ITEM_START_ROW + 1  # 2 ítems en el template base

# Namespaces no estándar del template (generado por conversión xls→xlsx)
_NS_REPLACEMENTS = [
    (b"http://purl.oclc.org/ooxml/spreadsheetml/main",
     b"http://schemas.openxmlformats.org/spreadsheetml/2006/main"),
    (b"http://purl.oclc.org/ooxml/officeDocument/relationships",
     b"http://schemas.openxmlformats.org/officeDocument/2006/relationships"),
]


def _fix_namespace(template_bytes: bytes) -> bytes:
    """Corrige namespaces no estándar del template para que openpyxl pueda leerlo."""
    buf = BytesIO()
    with zipfile.ZipFile(BytesIO(template_bytes), 'r') as zin, \
         zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zout:
        for name in zin.namelist():
            data = zin.read(name)
            if name.endswith('.xml') or name.endswith('.rels'):
                for old, new in _NS_REPLACEMENTS:
                    data = data.replace(old, new)
            zout.writestr(name, data)
    buf.seek(0)
    return buf.read()


def _create_fallback_workbook(data: dict):
    """Genera un Excel básico funcional cuando el template está corrupto."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Cotización"

    ws['A1'] = "COTIZACIÓN OPEX SAS"
    ws['A2'] = "Cliente:"
    ws['B2'] = data.get("cliente", "")
    ws['A3'] = "Nº Cotización:"
    ws['B3'] = data.get("numero_cotizacion", "")
    ws['A4'] = "Fecha:"
    ws['B4'] = data.get("fecha", "").strftime("%d/%m/%Y") if hasattr(data.get("fecha"), "strftime") else str(data.get("fecha", ""))
    ws['A5'] = "Contacto:"
    ws['B5'] = data.get("contacto_nombre", "")

    ws.append([])
    ws.append(["#", "Referencia", "Descripción", "SAP", "Marca", "Cantidad", "P. Unitario USD", "P. Total USD"])
    for idx, item in enumerate(data.get("items", []), 1):
        ws.append([
            idx,
            item.get("referencia_usa", ""),
            item.get("descripcion", ""),
            item.get("referencia_cod_proveedor", ""),
            item.get("marca", "HOPPECKE"),
            float(item.get("cantidad", 0)),
            float(item.get("precio_unitario_usd", 0)),
            float(item.get("precio_total_usd", 0)),
        ])

    ws.append([])
    ws.append(["", "", "", "", "", "", "Subtotal USD:", float(data.get("subtotal_usd", 0))])
    ws.append(["", "", "", "", "", "", f"IVA {data.get('iva_pct', 19)}%:", float(data.get("subtotal_usd", 0)) * float(data.get("iva_pct", 19)) / 100])
    ws.append(["", "", "", "", "", "", "Total USD:", float(data.get("total_usd", 0))])
    ws.append([])
    ws.append(["Condiciones de pago:", data.get("condiciones_pago", "")])
    ws.append(["Condiciones de entrega:", data.get("condiciones_entrega", "")])
    ws.append(["Garantía:", data.get("condiciones_garantia", "")])
    ws.append(["Validez:", data.get("validez_oferta", "30 días")])
    ws.append(["Observaciones:", data.get("observaciones", "")])
    return wb


def fill_template(template_bytes: bytes, data: dict) -> bytes:
    try:
        wb = openpyxl.load_workbook(BytesIO(_fix_namespace(template_bytes)))
        ws = wb.active or (wb.worksheets[0] if wb.worksheets else None)
        if ws is None:
            raise ValueError("No se pudo leer la hoja del template")
    except Exception:
        wb = _create_fallback_workbook(data)
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
