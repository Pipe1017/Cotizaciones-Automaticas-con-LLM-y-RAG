#!/bin/bash
# =============================================================
# Deploy OPEX CRM en Ubuntu desde cero
# Ejecutar como: bash scripts/deploy_ubuntu.sh
# =============================================================
set -e

REPO="https://github.com/Pipe1017/Cotizaciones-Automaticas-con-LLM-y-RAG.git"
APP_DIR="$HOME/opex-crm"

echo ""
echo "=============================="
echo "  OPEX CRM — Deploy Ubuntu"
echo "=============================="
echo ""

# 1. Instalar dependencias del sistema
echo ">>> Instalando Docker y dependencias..."
sudo apt-get update -q
sudo apt-get install -y -q docker.io docker-compose-v2 git curl

sudo systemctl enable docker --now
sudo usermod -aG docker "$USER"

# 2. Clonar o actualizar repo
if [ -d "$APP_DIR/.git" ]; then
  echo ">>> Actualizando repo existente..."
  cd "$APP_DIR" && git pull origin main
else
  echo ">>> Clonando repositorio..."
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# 3. Verificar .env
if [ ! -f ".env" ]; then
  echo ""
  echo ">>> ATENCIÓN: No existe .env — copiando ejemplo..."
  cp .env.prod.example .env
  echo ""
  echo "  Edita .env antes de continuar:"
  echo "    nano .env"
  echo ""
  echo "  Campos obligatorios:"
  echo "    DEEPSEEK_API_KEY=sk-..."
  echo "    SECRET_KEY=<cadena-aleatoria>"
  echo "    POSTGRES_PASSWORD=<password-seguro>"
  echo ""
  echo "  Cuando termines vuelve a correr este script."
  exit 1
fi

# 4. Levantar contenedores
echo ">>> Levantando contenedores..."
docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.prod.yml up -d --build

# 5. Esperar a que la BD esté lista
echo ">>> Esperando base de datos..."
for i in $(seq 1 30); do
  if docker compose -f docker-compose.prod.yml exec -T db pg_isready -U aura_user -d aura -q 2>/dev/null; then
    echo "    BD lista."
    break
  fi
  echo "    Intento $i/30..."
  sleep 3
done

# 6. Migraciones
echo ">>> Aplicando migraciones Alembic..."
docker compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

# 7. Cargar catálogo
echo ">>> Cargando catálogo, proveedores y líneas de negocio..."
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U aura_user -d aura -f /dev/stdin < scripts/seed_catalog.sql

echo ""
echo "=============================="
echo "  Deploy completado"
echo "=============================="
echo ""
echo "  App corriendo en: http://$(hostname -I | awk '{print $1}')"
echo ""
echo "  Para crear el usuario admin:"
echo "    docker compose -f docker-compose.prod.yml exec backend \\"
echo "      python -m scripts.seed_admin admin 'Tu Nombre' TuPassword123 editor"
echo ""
echo "  Para configurar Cloudflare tunnel:"
echo "    cloudflared tunnel run <nombre-tunnel>"
echo ""
