from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import companies, contacts, opportunities, products, quotations, leads, exchange_rates, dashboard, business_lines

app = FastAPI(
    title="OPEX CRM",
    description="CRM inteligente con motor de cotización IA para OPEX SAS Colombia",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router, prefix="/api/companies", tags=["Empresas"])
app.include_router(contacts.router, prefix="/api/contacts", tags=["Contactos"])
app.include_router(opportunities.router, prefix="/api/opportunities", tags=["Oportunidades"])
app.include_router(products.router, prefix="/api/products", tags=["Productos"])
app.include_router(quotations.router, prefix="/api/quotations", tags=["Cotizaciones"])
app.include_router(leads.router, prefix="/api/leads", tags=["Leads Fertilizantes"])
app.include_router(exchange_rates.router, prefix="/api/exchange-rates", tags=["Tipos de Cambio"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(business_lines.router, prefix="/api/business-lines", tags=["Líneas de Negocio"])


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "app": "OPEX CRM", "version": "1.1.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
