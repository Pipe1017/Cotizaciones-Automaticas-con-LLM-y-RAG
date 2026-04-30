#!/bin/bash
# Ejecutar en el servidor Ubuntu: bash scripts/deploy.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo ">>> Actualizando código..."
git pull origin main

echo ">>> Construyendo imágenes..."
docker compose -f docker-compose.prod.yml build

echo ">>> Iniciando servicios..."
docker compose -f docker-compose.prod.yml up -d

echo ">>> Esperando que el backend esté listo..."
sleep 5

echo ">>> Aplicando migraciones de base de datos..."
docker compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

echo ">>> Estado de los contenedores:"
docker compose -f docker-compose.prod.yml ps

echo ">>> Deploy completado: $(date)"
