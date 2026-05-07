from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.database import get_db
from app.models.opportunity import Opportunity
from app.models.business_line import BusinessLine
from app.models.lead import Lead
from app.models.quotation import Quotation
from app.models.engineering import QuotationService as QuotationServiceModel

router = APIRouter()


@router.get("/kpis")
def get_kpis(business_line_id: Optional[int] = None, db: Session = Depends(get_db)):
    # Pipeline por línea de negocio
    pipeline_q = (
        db.query(
            BusinessLine.id.label("bl_id"),
            BusinessLine.nombre,
            func.count(Opportunity.id).label("oportunidades"),
            func.coalesce(func.sum(Opportunity.valor_usd), 0).label("valor_total_usd"),
            func.coalesce(
                func.sum(
                    Opportunity.valor_usd * Opportunity.prob_go * Opportunity.prob_get / 10000
                ), 0,
            ).label("comprometido_usd"),
            func.coalesce(
                func.sum(Opportunity.valor_usd * Opportunity.margen_pct / 100), 0
            ).label("margen_usd"),
        )
        .join(Opportunity, Opportunity.business_line_id == BusinessLine.id, isouter=True)
        .group_by(BusinessLine.id, BusinessLine.nombre)
        .order_by(BusinessLine.id)
    )

    if business_line_id:
        pipeline_q = pipeline_q.filter(
            (Opportunity.business_line_id == business_line_id) | (Opportunity.id == None)
        )

    pipeline = pipeline_q.all()

    # Totals
    opp_base = db.query(Opportunity)
    if business_line_id:
        opp_base = opp_base.filter(Opportunity.business_line_id == business_line_id)

    total_pipeline = float(
        opp_base.with_entities(func.coalesce(func.sum(Opportunity.valor_usd), 0)).scalar() or 0
    )

    opps_all = opp_base.with_entities(
        Opportunity.valor_usd, Opportunity.prob_go, Opportunity.prob_get,
        Opportunity.margen_pct, Opportunity.etapa,
    ).all()

    comprometido = sum(
        float(o.valor_usd or 0) * (o.prob_go or 50) * (o.prob_get or 50) / 10000
        for o in opps_all
    )
    # Margen esperado = valor × margen% para todas las oportunidades activas
    margen_esperado = sum(
        float(o.valor_usd or 0) * float(o.margen_pct or 0) / 100
        for o in opps_all
    )
    # Margen ganado = solo oportunidades con etapa 'Ganada'
    margen_ganado = sum(
        float(o.valor_usd or 0) * float(o.margen_pct or 0) / 100
        for o in opps_all
        if (o.etapa or '') == 'Ganada'
    )

    total_opps = opp_base.count()

    etapas_q = (
        opp_base.with_entities(Opportunity.etapa, func.count(Opportunity.id).label("count"))
        .group_by(Opportunity.etapa)
        .all()
    )

    active_quote_ids = (
        db.query(Opportunity.quotation_id)
        .filter(Opportunity.quotation_id.isnot(None))
    )
    quotes_q = db.query(Quotation).filter(Quotation.id.in_(active_quote_ids))
    if business_line_id:
        quotes_q = quotes_q.filter(Quotation.business_line_id == business_line_id)
    total_quotes = quotes_q.count()

    leads_by_stage = (
        db.query(Lead.etapa, func.count(Lead.id).label("count"))
        .group_by(Lead.etapa)
        .all()
    )

    # Margen de servicios = sum((tarifa_hora - tarifa_base) * horas) en cotizaciones activas
    active_quote_ids_list = [q[0] for q in db.query(Opportunity.quotation_id)
                             .filter(Opportunity.quotation_id.isnot(None)).all()]
    margen_servicios = float(
        db.query(func.coalesce(
            func.sum((QuotationServiceModel.tarifa_hora_usd - QuotationServiceModel.tarifa_base_usd)
                     * QuotationServiceModel.horas), 0
        )).filter(QuotationServiceModel.quotation_id.in_(active_quote_ids_list)).scalar() or 0
    )

    return {
        "pipeline": [
            {
                "bl_id": row.bl_id,
                "linea": row.nombre,
                "oportunidades": row.oportunidades,
                "valor_total_usd": float(row.valor_total_usd),
                "comprometido_usd": float(row.comprometido_usd),
                "margen_usd": float(row.margen_usd),
            }
            for row in pipeline
        ],
        "total_pipeline_usd": total_pipeline,
        "comprometido_usd": comprometido,
        "margen_esperado_usd": margen_esperado,
        "margen_ganado_usd": margen_ganado,
        "margen_servicios_usd": margen_servicios,
        "total_oportunidades": total_opps,
        "total_cotizaciones": total_quotes,
        "oportunidades_por_etapa": {(row.etapa or "Sin etapa"): row.count for row in etapas_q},
        "leads_por_etapa": {row.etapa: row.count for row in leads_by_stage},
        "total_leads": db.query(func.count(Lead.id)).scalar(),
    }
