"""
Script de migración: CRM_Desarrollo_Mercado.xlsx → PostgreSQL
Importa los 104 leads de fertilizantes/mercado.

Uso:
    cd backend
    python -m scripts.migrate_crm_fertilizantes
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.lead import Lead, LeadHistory

CRM_PATH = os.environ.get(
    "CRM_FERTILIZANTES_PATH",
    "/data/crm_fertilizantes/CRM_Desarrollo_Mercado.xlsx",
)


def clean_str(val) -> "str | None":
    """Convierte a str y devuelve None si es vacío, 'nan', o NaT."""
    if val is None:
        return None
    if pd.isna(val) if not isinstance(val, str) else False:
        return None
    s = str(val).strip()
    return None if s in ("nan", "", "—", "NaT", "0") else s


def parse_date(val) -> "datetime.date | None":
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    s = str(val).strip()
    if s in ("nan", "", "—", "NaT", "0"):
        return None
    try:
        if isinstance(val, datetime):
            return val.date()
        result = pd.to_datetime(val)
        return None if pd.isna(result) else result.date()
    except Exception:
        return None


def parse_float(val) -> "float | None":
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    s = str(val).strip()
    if s in ("nan", "", "—", "0"):
        return None
    try:
        return float(s.replace(",", "").replace("$", ""))
    except Exception:
        return None


def migrate_leads(db: Session) -> int:
    df = pd.read_excel(CRM_PATH, sheet_name="📋 CRM Leads", header=3)
    count = 0

    for _, row in df.iterrows():
        empresa = str(row.get("Empresa", "")).strip()
        if not empresa or empresa == "nan":
            continue

        prioridad_raw = str(row.get("Prioridad", "")).strip()
        if "Alta" in prioridad_raw:
            prioridad = "Alta"
        elif "Media" in prioridad_raw:
            prioridad = "Media"
        elif "Baja" in prioridad_raw:
            prioridad = "Baja"
        else:
            prioridad = prioridad_raw[:10] if prioridad_raw != "nan" else None

        lead = Lead(
            empresa=empresa,
            contacto=clean_str(row.get("Contacto")),
            cargo=clean_str(row.get("Cargo")),
            email=clean_str(row.get("Email")),
            telefono=clean_str(row.get("Teléfono")),
            industria=clean_str(row.get("Industria")),
            rol_estrategico=clean_str(row.get("Rol Estratégico")),
            responsable=clean_str(row.get("Responsable")),
            etapa=clean_str(row.get("Etapa")) or "Prospecto",
            prioridad=prioridad,
            fecha_ingreso=parse_date(row.get("Fecha Ingreso")),
            ultimo_contacto=parse_date(row.get("Últ. Contacto")),
            proxima_accion=clean_str(row.get("Próx. Acción")),
            fecha_prox_acc=parse_date(row.get("Fecha P. Acc.")),
            valor_estimado=parse_float(row.get("Valor Est. ($)")),
            prob_cierre=parse_float(row.get("Prob. Cierre")),
            semana_iso=clean_str(row.get("Semana")),
            linkedin_url=clean_str(row.get("LinkedIn / URL")),
            notas=clean_str(row.get("Notas")),
        )
        db.add(lead)
        count += 1

    db.commit()
    return count


def migrate_history(db: Session) -> int:
    df = pd.read_excel(CRM_PATH, sheet_name="📅 Historial Semanal", header=2)
    count = 0

    # Build a quick lookup empresa → lead_id
    leads = db.query(Lead).all()
    empresa_map = {l.empresa.lower(): l.id for l in leads}

    for _, row in df.iterrows():
        empresa = str(row.get("Empresa", "")).strip()
        contacto = str(row.get("Contacto", "")).strip()
        if not empresa or empresa == "nan":
            continue

        lead_id = empresa_map.get(empresa.lower())
        if not lead_id:
            continue

        history = LeadHistory(
            lead_id=lead_id,
            semana=str(row.get("Semana", "")).strip() or None,
            fecha=parse_date(row.get("Fecha")),
            etapa_anterior=str(row.get("Etapa Anterior", "")).strip() or None,
            etapa_nueva=str(row.get("Etapa Nueva", "")).strip() or None,
            accion_realizada=str(row.get("Acción Realizada", "")).strip() or None,
            resultado=str(row.get("Resultado", "")).strip() or None,
            responsable=str(row.get("Responsable", "")).strip() or None,
        )
        db.add(history)
        count += 1

    db.commit()
    return count


def run():
    print("Iniciando migración CRM Fertilizantes → PostgreSQL...")
    db: Session = SessionLocal()
    try:
        n1 = migrate_leads(db)
        print(f"  Leads importados: {n1}")
        n2 = migrate_history(db)
        print(f"  Historial importado: {n2} entradas")
        print("Migración completada.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
