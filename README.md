# AURA CRM — Cotizaciones Automáticas con LLM y RAG

CRM interno de OPEX SAS para gestión de oportunidades, empresas, contactos y generación automática de cotizaciones usando DeepSeek AI.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | FastAPI + SQLAlchemy + Alembic |
| Base de datos | PostgreSQL 15 |
| Almacenamiento | MinIO (S3-compatible) |
| IA | DeepSeek Chat API |
| Documentos | python-docx + LibreOffice (Word → PDF) |
| Contenedores | Docker + Docker Compose |

---

## Requisitos

- Docker Desktop instalado y corriendo
- Git

> En Windows 10: abrir **PowerShell** o **CMD** como administrador.

---

## Instalación rápida

### 1. Clonar el repositorio

```bash
git clone https://github.com/Pipe1017/Cotizaciones-Automaticas-con-LLM-y-RAG.git
cd Cotizaciones-Automaticas-con-LLM-y-RAG
```

### 2. Crear el archivo `.env`

Copiar el ejemplo y completar las claves:

```bash
# Windows CMD
copy .env.example .env

# Windows PowerShell / Mac / Linux
cp .env.example .env
```

Abrir `.env` y llenar:

```env
DEEPSEEK_API_KEY=sk-tu-clave-aqui   # Obtener en platform.deepseek.com
POSTGRES_PASSWORD=una-clave-segura
SECRET_KEY=cualquier-string-largo-aleatorio
```

El resto de valores pueden quedarse con los defaults del ejemplo.

### 3. Levantar los contenedores

```bash
docker compose up -d --build
```

La primera vez descarga imágenes y compila (~5 min). Las siguientes veces es instantáneo.

### 4. Aplicar migraciones de base de datos

```bash
docker compose exec backend alembic upgrade head
```

### 5. Abrir la aplicación

| Servicio | URL |
|----------|-----|
| App (frontend) | http://localhost:3000 |
| API docs | http://localhost:8000/docs |
| MinIO consola | http://localhost:9001 |

Credenciales MinIO por defecto: `minioadmin` / `minioadmin123`

---

## Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Ver logs solo del backend
docker compose logs -f backend

# Detener todo
docker compose down

# Detener y borrar datos (PostgreSQL + MinIO)
docker compose down -v

# Reconstruir solo el backend
docker compose up -d --build backend
```

---

## Estructura del proyecto

```
.
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy models
│   │   ├── routers/         # FastAPI endpoints
│   │   └── services/        # Lógica de negocio (IA, Word, PDF, Excel)
│   ├── alembic/versions/    # Migraciones de BD
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── pages/           # Pipeline, Cotizaciones, Empresas, Productos...
│       ├── components/      # Componentes reutilizables
│       └── lib/api.ts       # Todas las llamadas al backend
├── docker-compose.yml
└── .env.example             # Plantilla de variables de entorno
```

---

## Notas importantes

- El archivo `.env` **nunca** va al repositorio (está en `.gitignore`). Cada instalación debe tener su propio `.env`.
- Los archivos generados (cotizaciones Excel, Word, PDF) se guardan en **MinIO**, no en el repositorio.
- Las carpetas de contexto (`Conttexto CRM Baterias Traccion/`, `Contexto CRM Fertilizantes/`, etc.) contienen los documentos que usa la IA como base de conocimiento. Deben estar presentes para que la generación automática funcione.
