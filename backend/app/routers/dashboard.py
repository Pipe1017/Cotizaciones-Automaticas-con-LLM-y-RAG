from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import Optional

from app.database import get_db
from app.models.opportunity import Opportunity
from app.models.business_line import BusinessLine
from app.models.lead import Lead
from app.models.quotation import Quotation

router = APIRouter()


@router.get("/kpis")
def get_kpis(business_line_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Dashboard KPIs. Optional filter by business_line_id.
    Returns pipeline by business line, quote counts, lead funnel, and totals.
    """
    # Base filter for opportunities
    opp_filter = []
    if business_line_id:
        opp_filter.append(Opportunity.business_line_id == business_line_id)

    # Pipeline por línea de negocio
    pipeline_q = (
        db.query(
            BusinessLine.id.label("bl_id"),
            BusinessLine.nombre,
            func.count(Opportunity.id).label("oportunidades"),
            func.coalesce(func.sum(Opportunity.valor_usd), 0).label("valor_total_usd"),
            func.coalesce(
                func.sum(
                    case(
                        (Opportunity.probabilidad == "Comprometida", Opportunity.valor_usd),
                        else_=0,
                    )
                ),
                0,
            ).label("comprometido_usd"),
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

    # Totals (scoped to filter if any)
    opp_base = db.query(Opportunity)
    if business_line_id:
        opp_base = opp_base.filter(Opportunity.business_line_id == business_line_id)

    total_pipeline = float(
        opp_base.with_entities(func.coalesce(func.sum(Opportunity.valor_usd), 0)).scalar() or 0
    )
    # Comprometido = pipeline ponderado (valor × prob_go × prob_get / 10000)
    opps_for_pond = opp_base.with_entities(
        Opportunity.valor_usd, Opportunity.prob_go, Opportunity.prob_get
    ).all()
    comprometido = sum(
        float(o.valor_usd or 0) * (o.prob_go or 50) * (o.prob_get or 50) / 10000
        for o in opps_for_pond
    )
    total_opps = opp_base.count()

    # Oportunidades por etapa (funnel)
    etapas_q = (
        opp_base.with_entities(Opportunity.etapa, func.count(Opportunity.id).label("count"))
        .group_by(Opportunity.etapa)
        .all()
    )

    # Cotizaciones por estado — solo la versión activa (vinculada a la oportunidad)
    active_quote_ids = (
        db.query(Opportunity.quotation_id)
        .filter(Opportunity.quotation_id.isnot(None))
    )
    quotes_q = db.query(Quotation).filter(Quotation.id.in_(active_quote_ids))
    if business_line_id:
        quotes_q = quotes_q.filter(Quotation.business_line_id == business_line_id)
    quotes_by_estado = (
        quotes_q.with_entities(Quotation.estado, func.count(Quotation.id).label("count"))
        .group_by(Quotation.estado)
        .all()
    )
    total_quotes = quotes_q.count()

    # Lead funnel (not filtered by BL — leads don't have BL yet)
    leads_by_stage = (
        db.query(Lead.etapa, func.count(Lead.id).label("count"))
        .group_by(Lead.etapa)
        .all()
    )

    return {
        "pipeline": [
            {
                "bl_id": row.bl_id,
                "linea": row.nombre,
                "oportunidades": row.oportunidades,
                "valor_total_usd": float(row.valor_total_usd),
                "comprometido_usd": float(row.comprometido_usd),
            }
            for row in pipeline
        ],
        "total_pipeline_usd": total_pipeline,
        "comprometido_usd": comprometido,
        "total_oportunidades": total_opps,
        "total_cotizaciones": total_quotes,
        "cotizaciones_por_estado": {row.estado: row.count for row in quotes_by_estado},
        "oportunidades_por_etapa": {(row.etapa or "Sin etapa"): row.count for row in etapas_q},
        "leads_por_etapa": {row.etapa: row.count for row in leads_by_stage},
        "total_leads": db.query(func.count(Lead.id)).scalar(),
    }
