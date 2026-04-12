"""
Script de migración: CRM_OPEX_2026.xlsx → PostgreSQL
Importa empresas y oportunidades del pipeline de baterías/drives.

Uso:
    cd backend
    python -m scripts.migrate_crm_baterias
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.company import Company
from app.models.opportunity import Opportunity

CRM_PATH = os.environ.get(
    "CRM_BATERIAS_PATH",
    "/data/crm_baterias/CRM_OPEX_2026.xlsx",
)

MERCADO_TO_BL = {
    "TRACCION": 1,
    "ESTACIONARIA": 2,
    "QUIMICOS": 5,
    "LOGISTICA": 4,
    "Traccion": 1,
    "Estacionario": 2,
}


def get_or_create_company(db: Session, nombre: str) -> Company:
    nombre = str(nombre).strip()
    company = db.query(Company).filter(Company.nombre.ilike(nombre)).first()
    if not company:
        company = Company(nombre=nombre)
        db.add(company)
        db.flush()
    return company


def migrate_must_win(db: Session) -> int:
    df = pd.read_excel(CRM_PATH, sheet_name="Must Win FY26", header=None)
    count = 0

    for _, row in df.iterrows():
        vals = [str(v).strip() for v in row if str(v).strip() not in ("nan", "")]
        if len(vals) < 3:
            continue
        # Row pattern: [CLIENTE, DETALLE, MERCADO, Probabilidad, AC, apoyo_ra?, USD_value]
        if vals[0] in ("CLIENTE", "Oportunidades Must Win", "OPORTUNIDADES REPRESENTATIVAS"):
            continue
        try:
            cliente = vals[0]
            detalle = vals[1] if len(vals) > 1 else ""
            mercado = vals[2] if len(vals) > 2 else ""
            probabilidad = vals[3] if len(vals) > 3 else "Probable"
            asesor = vals[4] if len(vals) > 4 else ""

            # Find USD value (last element that looks like a money value)
            valor_usd = None
            for v in reversed(vals):
                clean = v.replace("$", "").replace(" ", "").replace(",", "")
                try:
                    valor_usd = float(clean)
                    break
                except ValueError:
                    continue

            company = get_or_create_company(db, cliente)
            bl_id = MERCADO_TO_BL.get(mercado, 1)

            opp = Opportunity(
                company_id=company.id,
                business_line_id=bl_id,
                titulo=detalle,
                descripcion=f"Must Win FY26 — {mercado}",
                valor_usd=valor_usd,
                probabilidad=probabilidad,
                etapa="Must Win",
                asesor=asesor,
            )
            db.add(opp)
            count += 1
        except Exception:
            continue

    db.commit()
    return count


def migrate_plan_foco(db: Session) -> int:
    df = pd.read_excel(CRM_PATH, sheet_name="PLAN FOCO", header=0)
    count = 0

    for _, row in df.iterrows():
        try:
            cliente = str(row.get("Cliente", "")).strip()
            if not cliente or cliente == "nan":
                continue
            mercado = str(row.get("MERCADO", "")).strip()
            asesor = str(row.get("Asesor", "")).strip()
            iniciativa = str(row.get("Iniciativa", "")).strip()
            soporte = str(row.get("Tipo Soporte o Herramienta", "")).strip()

            company = get_or_create_company(db, cliente)
            bl_id = MERCADO_TO_BL.get(mercado, 1)

            opp = Opportunity(
                company_id=company.id,
                business_line_id=bl_id,
                titulo=iniciativa if iniciativa != "nan" else f"Plan Foco — {cliente}",
                descripcion=soporte if soporte != "nan" else None,
                probabilidad="Probable",
                etapa="Plan Foco",
                asesor=asesor if asesor != "nan" else None,
            )
            db.add(opp)
            count += 1
        except Exception:
            continue

    db.commit()
    return count


def run():
    print("Iniciando migración CRM Baterías → PostgreSQL...")
    db: Session = SessionLocal()
    try:
        n1 = migrate_must_win(db)
        print(f"  Must Win FY26: {n1} oportunidades importadas")
        n2 = migrate_plan_foco(db)
        print(f"  Plan Foco: {n2} oportunidades importadas")
        print("Migración completada.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
