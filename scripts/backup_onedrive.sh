#!/bin/bash
# Backup diario a OneDrive via rclone
# Configurar rclone primero: rclone config (elegir OneDrive, nombre "onedrive")
# Agregar al cron: 0 2 * * * /opt/TCM_OPEX/scripts/backup_onedrive.sh >> /var/log/opex_backup.log 2>&1
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/opex_backup_$TIMESTAMP"
ONEDRIVE_PATH="onedrive:Backups/opextcm/$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

echo "=== Backup OPEX CRM: $TIMESTAMP ==="

# 1. Dump PostgreSQL
echo ">>> Dumpeando PostgreSQL..."
docker compose -f "$APP_DIR/docker-compose.prod.yml" exec -T db \
  pg_dump -U "${POSTGRES_USER:-aura_user}" "${POSTGRES_DB:-aura}" \
  --clean --if-exists \
  > "$BACKUP_DIR/postgres_$TIMESTAMP.sql"
gzip "$BACKUP_DIR/postgres_$TIMESTAMP.sql"

# 2. Exportar datos de MinIO desde dentro del contenedor
echo ">>> Exportando datos de MinIO..."
docker compose -f "$APP_DIR/docker-compose.prod.yml" exec -T minio \
  tar czf - /data \
  > "$BACKUP_DIR/minio_$TIMESTAMP.tar.gz"

# 3. Subir a OneDrive
echo ">>> Subiendo a OneDrive en $ONEDRIVE_PATH ..."
rclone copy "$BACKUP_DIR" "$ONEDRIVE_PATH" --progress

# 4. Limpiar temporales
rm -rf "$BACKUP_DIR"

# 5. Borrar backups con más de 30 días en OneDrive
rclone delete onedrive:Backups/opextcm \
  --min-age 30d --rmdirs 2>/dev/null || true

echo ">>> Backup completado: $TIMESTAMP"
