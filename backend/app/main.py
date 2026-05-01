from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.deps import viewer_or_editor
from app.routers import (
    auth,
    business_lines,
    companies,
    contacts,
    dashboard,
    exchange_rates,
    leads,
    opportunities,
    products,
    proveedores,
    quotations,
)

app = FastAPI(
    title="OPEX CRM",
    description="CRM inteligente con motor de cotización IA para OPEX SAS Colombia",
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth — sin protección (login público) ──────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])

# ── Todos los demás requieren token válido ─────────────────────
# viewer → solo GET  |  editor → todo
_p = {"dependencies": [Depends(viewer_or_editor)]}

app.include_router(companies.router,      prefix="/api/companies",      tags=["Empresas"],           **_p)
app.include_router(contacts.router,       prefix="/api/contacts",        tags=["Contactos"],          **_p)
app.include_router(opportunities.router,  prefix="/api/opportunities",   tags=["Oportunidades"],      **_p)
app.include_router(products.router,       prefix="/api/products",        tags=["Productos"],          **_p)
app.include_router(quotations.router,     prefix="/api/quotations",      tags=["Cotizaciones"],       **_p)
app.include_router(leads.router,          prefix="/api/leads",           tags=["Leads Fertilizantes"],**_p)
app.include_router(exchange_rates.router, prefix="/api/exchange-rates",  tags=["Tipos de Cambio"],    **_p)
app.include_router(dashboard.router,      prefix="/api/dashboard",       tags=["Dashboard"],          **_p)
app.include_router(business_lines.router, prefix="/api/business-lines",  tags=["Líneas de Negocio"],  **_p)
app.include_router(proveedores.router,    prefix="/api/proveedores",      tags=["Proveedores"],         **_p)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "app": "OPEX CRM", "version": "1.2.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
