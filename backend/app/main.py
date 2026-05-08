from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import settings
from app.core.deps import viewer_or_editor
from app.routers import (
    auth,
    backup,
    business_lines,
    companies,
    contacts,
    dashboard,
    engineering,
    exchange_rates,
    leads,
    opportunities,
    products,
    proveedores,
    quotations,
)

scheduler = AsyncIOScheduler()


async def _scheduled_backup():
    """Corre el backup automático si está habilitado y es la hora configurada."""
    from datetime import datetime, timezone
    from app.database import SessionLocal
    from app.routers.backup import BackupConfig, _run_backup
    db = SessionLocal()
    try:
        cfg = db.query(BackupConfig).first()
        if not cfg or not cfg.enabled or not cfg.rclone_remote or not cfg.remote_path:
            return
        # Solo corre en la hora configurada (UTC)
        if cfg.schedule_hour is not None and datetime.now(timezone.utc).hour != cfg.schedule_hour:
            return
        await _run_backup(cfg.id, str(settings.database_url))
    finally:
        db.close()


def _ensure_admin_user():
    """Si no hay ningún usuario en la BD, crea uno por defecto al arrancar."""
    from app.database import SessionLocal
    from app.models.user import User
    from app.core.security import hash_password
    import logging
    log = logging.getLogger(__name__)
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            u = User(
                username="admin",
                nombre="Administrador",
                hashed_password=hash_password("Admin123"),
                rol="editor",
                activo=True,
            )
            db.add(u)
            db.commit()
            log.warning("=" * 60)
            log.warning("USUARIO ADMIN CREADO AUTOMÁTICAMENTE")
            log.warning("  username: admin")
            log.warning("  password: Admin123")
            log.warning("  *** CAMBIA LA CONTRASEÑA DESPUÉS DEL PRIMER LOGIN ***")
            log.warning("=" * 60)
    finally:
        db.close()


def _ensure_minio_buckets():
    """Crea los buckets de MinIO si no existen."""
    import logging
    log = logging.getLogger(__name__)
    try:
        from app.services.minio_service import MinioService
        MinioService().ensure_all_buckets()
        log.info("MinIO buckets verificados/creados correctamente.")
    except Exception as e:
        log.warning("No se pudieron verificar los buckets de MinIO: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_minio_buckets()
    _ensure_admin_user()
    # Cron: revisa cada hora si toca hacer backup
    scheduler.add_job(_scheduled_backup, "cron", minute=0)
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="OPEX CRM",
    description="CRM inteligente con motor de cotización IA para OPEX SAS Colombia",
    version="1.2.0",
    lifespan=lifespan,
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
app.include_router(proveedores.router,    prefix="/api/proveedores",     tags=["Proveedores"],        **_p)
app.include_router(backup.router,         prefix="/api/backup",          tags=["Backup"],             **_p)
app.include_router(engineering.router,    prefix="/api/engineering-roles", tags=["Ingeniería"],         **_p)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "app": "OPEX CRM", "version": "1.2.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
