"""
Backup router — configuración y ejecución de backups a nube via rclone.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, Numeric
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import asyncio, subprocess, os, tempfile

from app.database import get_db, Base
from app.core.deps import require_editor
from app.config import settings

router = APIRouter()


# ── Models ────────────────────────────────────────────────────────────────────

class BackupConfig(Base):
    __tablename__ = "backup_config"
    id             = Column(Integer, primary_key=True)
    rclone_remote  = Column(String(100))
    remote_path    = Column(String(300))
    include_db     = Column(Boolean, default=True)
    include_files  = Column(Boolean, default=True)
    schedule_hour  = Column(Integer, default=2)
    enabled        = Column(Boolean, default=False)
    last_run_at    = Column(DateTime(timezone=True))
    last_run_status = Column(String(20))
    last_run_log   = Column(Text)


class BackupLog(Base):
    __tablename__ = "backup_logs"
    id          = Column(Integer, primary_key=True)
    started_at  = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True))
    status      = Column(String(20))
    log         = Column(Text)
    size_mb     = Column(Numeric(10, 2))


# ── Schemas ───────────────────────────────────────────────────────────────────

class ConfigIn(BaseModel):
    rclone_remote: Optional[str] = None
    remote_path: Optional[str] = None
    include_db: bool = True
    include_files: bool = True
    schedule_hour: int = 2
    enabled: bool = False


class ConfigOut(ConfigIn):
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None
    last_run_log: Optional[str] = None

    class Config:
        from_attributes = True


class LogOut(BaseModel):
    id: int
    started_at: datetime
    finished_at: Optional[datetime] = None
    status: str
    log: Optional[str] = None
    size_mb: Optional[float] = None

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_or_create_config(db: Session) -> BackupConfig:
    cfg = db.query(BackupConfig).first()
    if not cfg:
        cfg = BackupConfig()
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


def _check_rclone() -> bool:
    try:
        result = subprocess.run(["rclone", "version"], capture_output=True, timeout=5)
        return result.returncode == 0
    except Exception:
        return False


def _list_remotes() -> list[str]:
    try:
        result = subprocess.run(
            ["rclone", "listremotes"], capture_output=True, text=True, timeout=10
        )
        return [r.rstrip(":") for r in result.stdout.strip().splitlines() if r]
    except Exception:
        return []


async def _run_backup(config_id: int, db_url: str):
    """Ejecuta el backup en background y guarda el log."""
    from app.database import SessionLocal
    db = SessionLocal()
    log_entry = BackupLog(status="running", log="Iniciando backup...\n")
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    cfg = db.query(BackupConfig).first()
    if not cfg or not cfg.rclone_remote or not cfg.remote_path:
        log_entry.status = "error"
        log_entry.log += "Error: configuración incompleta.\n"
        log_entry.finished_at = datetime.now(timezone.utc)
        db.commit()
        db.close()
        return

    remote_dest = f"{cfg.rclone_remote}:{cfg.remote_path}"
    log = ""
    total_size = 0.0
    ok = True

    # 1. Backup BD
    if cfg.include_db:
        log += "── Backup de base de datos ──\n"
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")
        with tempfile.TemporaryDirectory() as tmpdir:
            dump_path = os.path.join(tmpdir, f"opex_db_{ts}.sql.gz")
            try:
                dump_cmd = (
                    f"pg_dump {db_url} | gzip > {dump_path}"
                )
                proc = await asyncio.create_subprocess_shell(
                    dump_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                _, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
                if proc.returncode != 0:
                    raise RuntimeError(stderr.decode())

                size_mb = os.path.getsize(dump_path) / 1024 / 1024
                total_size += size_mb
                log += f"  Dump OK ({size_mb:.1f} MB)\n"

                upload = await asyncio.create_subprocess_exec(
                    "rclone", "copy", dump_path, f"{remote_dest}/db/",
                    "--progress",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                _, uerr = await asyncio.wait_for(upload.communicate(), timeout=180)
                if upload.returncode != 0:
                    raise RuntimeError(uerr.decode())
                log += f"  Subido a {remote_dest}/db/opex_db_{ts}.sql.gz\n"
            except Exception as e:
                log += f"  ERROR BD: {e}\n"
                ok = False

    # 2. Sync archivos MinIO
    if cfg.include_files:
        log += "── Sync archivos MinIO ──\n"
        minio_host = getattr(settings, "minio_endpoint", "minio:9000")
        minio_bucket = settings.minio_bucket_quotations
        minio_access = getattr(settings, "minio_access_key", "")
        minio_secret = getattr(settings, "minio_secret_key", "")

        env = os.environ.copy()
        env["RCLONE_CONFIG_MINIO_TYPE"] = "s3"
        env["RCLONE_CONFIG_MINIO_PROVIDER"] = "Minio"
        env["RCLONE_CONFIG_MINIO_ENDPOINT"] = f"http://{minio_host}"
        env["RCLONE_CONFIG_MINIO_ACCESS_KEY_ID"] = minio_access
        env["RCLONE_CONFIG_MINIO_SECRET_ACCESS_KEY"] = minio_secret
        env["RCLONE_CONFIG_MINIO_REGION"] = "us-east-1"

        try:
            sync = await asyncio.create_subprocess_exec(
                "rclone", "sync",
                f"minio:{minio_bucket}",
                f"{remote_dest}/files/",
                "--progress",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )
            _, serr = await asyncio.wait_for(sync.communicate(), timeout=300)
            if sync.returncode != 0:
                raise RuntimeError(serr.decode())
            log += f"  Sync OK → {remote_dest}/files/\n"
        except Exception as e:
            log += f"  ERROR archivos: {e}\n"
            ok = False

    # Actualizar config y log
    now = datetime.now(timezone.utc)
    cfg.last_run_at = now
    cfg.last_run_status = "ok" if ok else "error"
    cfg.last_run_log = log
    log_entry.finished_at = now
    log_entry.status = "ok" if ok else "error"
    log_entry.log = log
    log_entry.size_mb = round(total_size, 2)
    db.commit()
    db.close()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/config", response_model=ConfigOut)
def get_config(db: Session = Depends(get_db), _=Depends(require_editor)):
    return _get_or_create_config(db)


@router.put("/config", response_model=ConfigOut)
def save_config(data: ConfigIn, db: Session = Depends(get_db), _=Depends(require_editor)):
    cfg = _get_or_create_config(db)
    for k, v in data.model_dump().items():
        setattr(cfg, k, v)
    db.commit()
    db.refresh(cfg)
    return cfg


@router.get("/remotes")
def list_remotes(_=Depends(require_editor)):
    """Lista los remotes rclone configurados en el servidor."""
    if not _check_rclone():
        return {"remotes": [], "rclone_installed": False}
    return {"remotes": _list_remotes(), "rclone_installed": True}


@router.post("/run")
async def run_backup(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _=Depends(require_editor),
):
    cfg = _get_or_create_config(db)
    if not cfg.rclone_remote or not cfg.remote_path:
        raise HTTPException(400, "Configura el remote y la carpeta destino primero.")

    db_url = str(settings.database_url)
    background_tasks.add_task(_run_backup, cfg.id, db_url)
    return {"message": "Backup iniciado en background"}


@router.get("/logs", response_model=list[LogOut])
def get_logs(db: Session = Depends(get_db), _=Depends(require_editor)):
    return db.query(BackupLog).order_by(BackupLog.started_at.desc()).limit(20).all()


# ── Restore ───────────────────────────────────────────────────────────────────

class RestoreRequest(BaseModel):
    filename: str


@router.get("/restore/list")
def list_restore_points(db: Session = Depends(get_db), _=Depends(require_editor)):
    """Lista los dumps de BD disponibles en Google Drive."""
    cfg = _get_or_create_config(db)
    if not cfg.rclone_remote or not cfg.remote_path:
        raise HTTPException(400, "Configura el backup primero")
    try:
        result = subprocess.run(
            ["rclone", "lsf", f"{cfg.rclone_remote}:{cfg.remote_path}/db/"],
            capture_output=True, text=True, timeout=30,
        )
        files = []
        for line in result.stdout.strip().splitlines():
            name = line.strip()
            if name.endswith(".sql.gz"):
                files.append({"filename": name, "date": ""})
        return sorted(files, key=lambda x: x["filename"], reverse=True)
    except subprocess.TimeoutExpired:
        raise HTTPException(500, "Timeout al listar backups en el remote")


async def _run_restore_db(remote: str, path: str, filename: str, db_url: str):
    import logging
    log = logging.getLogger(__name__)
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            dump_path = os.path.join(tmpdir, filename)
            dl = await asyncio.create_subprocess_exec(
                "rclone", "copy", f"{remote}:{path}/db/{filename}", tmpdir,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            )
            _, err = await asyncio.wait_for(dl.communicate(), timeout=120)
            if dl.returncode != 0:
                log.error("Restore BD — error descargando: %s", err.decode())
                return
            restore_cmd = f"gunzip -c {dump_path} | psql {db_url}"
            proc = await asyncio.create_subprocess_shell(
                restore_cmd,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            )
            _, err = await asyncio.wait_for(proc.communicate(), timeout=300)
            if proc.returncode != 0:
                log.error("Restore BD — error psql: %s", err.decode())
            else:
                log.info("BD restaurada correctamente desde %s", filename)
    except Exception as e:
        log.error("Restore BD — excepción: %s", e)


async def _run_restore_files(remote: str, path: str):
    import logging
    log = logging.getLogger(__name__)
    minio_host = getattr(settings, "minio_endpoint", "minio:9000")
    env = os.environ.copy()
    env["RCLONE_CONFIG_MINIO_TYPE"] = "s3"
    env["RCLONE_CONFIG_MINIO_PROVIDER"] = "Minio"
    env["RCLONE_CONFIG_MINIO_ENDPOINT"] = f"http://{minio_host}"
    env["RCLONE_CONFIG_MINIO_ACCESS_KEY_ID"] = getattr(settings, "minio_access_key", "")
    env["RCLONE_CONFIG_MINIO_SECRET_ACCESS_KEY"] = getattr(settings, "minio_secret_key", "")
    env["RCLONE_CONFIG_MINIO_REGION"] = "us-east-1"
    try:
        sync = await asyncio.create_subprocess_exec(
            "rclone", "sync",
            f"{remote}:{path}/files/",
            f"minio:{settings.minio_bucket_quotations}",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            env=env,
        )
        _, err = await asyncio.wait_for(sync.communicate(), timeout=300)
        if sync.returncode != 0:
            log.error("Restore archivos — error: %s", err.decode())
        else:
            log.info("Archivos MinIO restaurados desde %s", remote)
    except Exception as e:
        log.error("Restore archivos — excepción: %s", e)


@router.post("/restore/db")
async def restore_db(
    data: RestoreRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _=Depends(require_editor),
):
    cfg = _get_or_create_config(db)
    if not cfg.rclone_remote or not cfg.remote_path:
        raise HTTPException(400, "Configura el backup primero")
    background_tasks.add_task(
        _run_restore_db, cfg.rclone_remote, cfg.remote_path,
        data.filename, str(settings.database_url),
    )
    return {"message": f"Restaurando {data.filename} en background"}


@router.post("/restore/files")
async def restore_files(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _=Depends(require_editor),
):
    cfg = _get_or_create_config(db)
    if not cfg.rclone_remote or not cfg.remote_path:
        raise HTTPException(400, "Configura el backup primero")
    background_tasks.add_task(_run_restore_files, cfg.rclone_remote, cfg.remote_path)
    return {"message": "Restaurando archivos en background"}
