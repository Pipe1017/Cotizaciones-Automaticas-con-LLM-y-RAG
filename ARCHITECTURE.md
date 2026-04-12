# AURA — OPEX CRM: Propuesta de Arquitectura

> Documento generado tras análisis de todos los archivos de contexto.
> Fecha: 2026-04-11

---

## 1. Hallazgos del Análisis de Contexto

### 1.1 Líneas de Negocio Identificadas

| # | Línea | Fuente |
|---|-------|--------|
| 1 | **TRACCION** | Baterías industriales HOPPECKE para montacargas (HYSTER) |
| 2 | **ESTACIONARIA** | Baterías de respaldo y sistemas UPS |
| 3 | **DRIVES / VARIADORES** | Variadores AB/ABB (525, 617, 755T) — visibles en Must Win FY26 |
| 4 | **LOGISTICA** | Servicios y consumibles logísticos |
| 5 | **QUIMICOS / FERTILIZANTES** | Mercado agrícola — CRM de desarrollo de mercado separado |
| 6 | **OTROS / PROYECTOS** | Licitaciones, servicios especiales, hidrógeno (futuro) |

### 1.2 Dos Dinámicas CRM Distintas

**CRM Baterías/Drives** (`CRM_OPEX_2026.xlsx`)
- Pipeline clásico con probabilidades: Comprometida / Probable / Perdida
- Seguimiento por Must Win, pronóstico mensual, agenda semanal
- KPIs: Cotizaciones YTD, Órdenes YTD, Facturación YTD por mercado
- Tipos de cambio EUR→USD y EUR→COP configurables

**CRM Fertilizantes** (`CRM_Desarrollo_Mercado.xlsx`)
- Funnel de desarrollo de mercado con 104 leads, etapas: Prospecto → Contactado → Reunión Agendada → Propuesta Enviada → Negociación → Cerrado / Perdido
- Roles estratégicos: Lead Directo, Equity/Inversor, Socio Estratégico, Sponsor, Offtaker
- Historial semanal por ISO-week (ej. `2026-W14`)

### 1.3 Catálogo HOPPECKE (`HOPPECKE...xls`)
- 35 referencias de baterías: 24V, 36V, 48V y 80V (series HPzS y HPzB)
- Campos: Voltaje, Referencia USA, Tipo conector, Modelo HOPPECKE, Código SAP, Tensión, Capacidad (Ah/C6), kWh, Peso, Dimensiones (L×A×H mm), Código cofre
- **Precios en € y USD están vacíos en el archivo** → se gestionarán directamente en AURA

### 1.4 Template de Cotización (`Formato SIMPLE NUEVO.xls`)
Sheet: `Hoja2` — Mapa de celdas relevantes (1-indexed, fila×columna):

| Dato | Fila | Col | Ejemplo actual |
|------|------|-----|----------------|
| Nombre del cliente | 6 | 7 | `Cliente` (label) |
| Nº de cotización | 9 | 2 | `Nº de cotización` (label) |
| Fecha | 9 | 5 | — |
| Páginas | 9 | 7 | — |
| Persona de contacto | 12 | 8 | `Sr. Gustavo Mejías` |
| **Tabla de ítems** — ITEM | 16..21 | 2 | número de ítem |
| REFERENCIA | 16..21 | 3 | ref. USA |
| DESCRIPCION | 16..21 | 4 | descripción larga |
| REF-COD PROVEEDOR | 16..21 | 8 | Código SAP |
| MARCA | 16..21 | 11 | HOPPECKE |
| QTD | 16..21 | 13 | cantidad |
| PRECIO UNITARIO | 16..21 | 14 | USD unit |
| PRECIO TOTAL | 16..21 | 15 | USD total |
| SUBTOTAL | 22 | 14 | calculado |
| IVA 19% | 23 | 14 | calculado |
| TOTAL | 24 | 14 | calculado |
| Observaciones | 28 | 2 | texto libre |
| Fecha entrega | 40 | 3 | — |
| Condiciones de entrega | 42 | 3 | — |
| Condiciones de pago | 44 | 3 | — |
| Condiciones de garantía | 46 | 3 | — |
| Validez de la oferta | 48 | 3 | — |

> El template original se almacenará en MinIO como archivo base. Cada cotización generada producirá una copia en MinIO usando `openpyxl`.
> **Nota:** el archivo original es `.xls` (formato antiguo). Se convertirá a `.xlsx` para compatibilidad con `openpyxl`.

---

## 2. Modelo de Datos (PostgreSQL)

### Diagrama de entidades

```
companies ──< contacts
    │
    └──< opportunities >── business_lines
              │
              └──< quotations >── quotation_items >── products
              │
              └──< activities

leads (fertilizantes)
    └──< lead_history
```

### Esquema SQL sugerido

```sql
-- Líneas de negocio
CREATE TABLE business_lines (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(60) UNIQUE NOT NULL,  -- TRACCION, ESTACIONARIA, etc.
    descripcion TEXT,
    activa      BOOLEAN DEFAULT TRUE
);

-- Empresas / Cuentas
CREATE TABLE companies (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(200) NOT NULL,
    industria   VARCHAR(100),
    ciudad      VARCHAR(100),
    region      VARCHAR(10),               -- BOG, MED, CLO, CTG, BAQ, PEI
    pais        VARCHAR(60) DEFAULT 'Colombia',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Contactos
CREATE TABLE contacts (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    nombre      VARCHAR(200) NOT NULL,
    cargo       VARCHAR(200),
    email       VARCHAR(200),
    telefono    VARCHAR(50),
    linkedin_url TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Oportunidades (pipeline principal)
CREATE TABLE opportunities (
    id               SERIAL PRIMARY KEY,
    company_id       INTEGER REFERENCES companies(id),
    contact_id       INTEGER REFERENCES contacts(id),
    business_line_id INTEGER REFERENCES business_lines(id),
    titulo           VARCHAR(300) NOT NULL,
    descripcion      TEXT,
    valor_usd        NUMERIC(14, 2),
    probabilidad     VARCHAR(30),  -- Comprometida, Probable, Perdida
    etapa            VARCHAR(50),  -- Must Win, Plan Foco, Cotizacion, OC, Facturacion
    asesor           VARCHAR(100),
    apoyo_ra         VARCHAR(100),
    mes_esperado     DATE,
    observaciones    TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Log de actividades
CREATE TABLE activities (
    id              SERIAL PRIMARY KEY,
    opportunity_id  INTEGER REFERENCES opportunities(id),
    contact_id      INTEGER REFERENCES contacts(id),
    tipo            VARCHAR(60),  -- Llamada, Email, Reunión, Cotización, OC
    descripcion     TEXT,
    resultado       TEXT,
    responsable     VARCHAR(100),
    fecha           DATE NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Catálogo de productos (HOPPECKE + otros)
CREATE TABLE products (
    id                   SERIAL PRIMARY KEY,
    business_line_id     INTEGER REFERENCES business_lines(id),
    voltaje              VARCHAR(10),       -- 24V, 36V, 48V, 80V
    referencia_usa       VARCHAR(50),
    tipo_conector        VARCHAR(30),
    modelo_hoppecke      VARCHAR(80),
    codigo_sap           VARCHAR(30),
    tension_v            NUMERIC(6, 1),
    capacidad_ah         NUMERIC(8, 1),
    kwh                  NUMERIC(8, 3),
    peso_kg              NUMERIC(8, 1),
    largo_mm             NUMERIC(8, 1),
    ancho_mm             NUMERIC(8, 1),
    altura_mm            NUMERIC(8, 1),
    codigo_cofre         VARCHAR(20),
    precio_neto_eur      NUMERIC(12, 2),
    precio_neto_usd      NUMERIC(12, 2),
    activo               BOOLEAN DEFAULT TRUE,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Tipos de cambio
CREATE TABLE exchange_rates (
    id          SERIAL PRIMARY KEY,
    currency    VARCHAR(5) NOT NULL,   -- EUR, COP
    rate_to_usd NUMERIC(12, 4) NOT NULL,
    fecha       DATE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Cotizaciones
CREATE TABLE quotations (
    id                   SERIAL PRIMARY KEY,
    opportunity_id       INTEGER REFERENCES opportunities(id),
    company_id           INTEGER REFERENCES companies(id),
    numero_cotizacion    VARCHAR(50) UNIQUE NOT NULL,
    fecha                DATE NOT NULL,
    contacto_nombre      VARCHAR(200),
    subtotal_usd         NUMERIC(14, 2),
    iva_pct              NUMERIC(5, 2) DEFAULT 19.0,
    total_usd            NUMERIC(14, 2),
    moneda               VARCHAR(5) DEFAULT 'USD',
    tipo_cambio_eur      NUMERIC(12, 4),
    observaciones        TEXT,
    condiciones_entrega  TEXT,
    condiciones_pago     TEXT,
    condiciones_garantia TEXT,
    validez_oferta       VARCHAR(100),
    fecha_entrega        VARCHAR(100),
    estado               VARCHAR(20) DEFAULT 'borrador',  -- borrador, enviada, aprobada, rechazada
    file_path_minio      TEXT,
    created_by           VARCHAR(100),
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Ítems de cotización
CREATE TABLE quotation_items (
    id                      SERIAL PRIMARY KEY,
    quotation_id            INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
    item_number             SMALLINT NOT NULL,
    referencia_usa          VARCHAR(50),
    descripcion             TEXT NOT NULL,
    referencia_cod_proveedor VARCHAR(50),
    marca                   VARCHAR(50) DEFAULT 'HOPPECKE',
    cantidad                NUMERIC(8, 2) NOT NULL,
    precio_unitario_usd     NUMERIC(12, 2) NOT NULL,
    precio_total_usd        NUMERIC(14, 2) GENERATED ALWAYS AS (cantidad * precio_unitario_usd) STORED
);

-- CRM Fertilizantes — Leads de desarrollo de mercado
CREATE TABLE leads (
    id               SERIAL PRIMARY KEY,
    empresa          VARCHAR(200) NOT NULL,
    contacto         VARCHAR(200),
    cargo            VARCHAR(200),
    email            VARCHAR(200),
    telefono         VARCHAR(50),
    industria        VARCHAR(100),
    rol_estrategico  VARCHAR(60),  -- Lead Directo, Equity/Inversor, Socio Estratégico, Sponsor, Offtaker
    responsable      VARCHAR(100),
    etapa            VARCHAR(50),  -- Prospecto, Contactado, Reunión Agendada, Propuesta Enviada, Negociación, Cerrado, Perdido
    prioridad        VARCHAR(10),  -- Alta, Media, Baja
    fecha_ingreso    DATE,
    ultimo_contacto  DATE,
    proxima_accion   TEXT,
    fecha_prox_acc   DATE,
    valor_estimado   NUMERIC(14, 2),
    prob_cierre      NUMERIC(5, 2),
    semana_iso       VARCHAR(10),  -- YYYY-WXX
    linkedin_url     TEXT,
    notas            TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Historial semanal de leads (Fertilizantes)
CREATE TABLE lead_history (
    id               SERIAL PRIMARY KEY,
    lead_id          INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    semana           VARCHAR(10),
    fecha            DATE,
    etapa_anterior   VARCHAR(50),
    etapa_nueva      VARCHAR(50),
    accion_realizada TEXT,
    resultado        TEXT,
    responsable      VARCHAR(100),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Flujo de Automatización de Cotizaciones con IA

```
┌─────────────────────────────────────────────────────────────────────┐
│  USUARIO                                                            │
│  "Cliente POWERTEK necesita 3 baterías 48V para HYSTER,            │
│   entrega Cali, pago 30 días, garantía 1 año"                      │
└────────────────────┬────────────────────────────────────────────────┘
                     │ POST /api/quotations/generate
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FastAPI — QuotationService                                         │
│  1. Construye system prompt con catálogo HOPPECKE (JSON del DB)    │
│  2. Llama a DeepSeek API                                           │
└────────────────────┬────────────────────────────────────────────────┘
                     │ POST api.deepseek.com/v1/chat/completions
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  DeepSeek — Respuesta estructurada (JSON)                          │
│  {                                                                  │
│    "items": [                                                       │
│      { "referencia_usa": "24-85-15",                               │
│        "modelo": "48V 6 HPzS 690",                                 │
│        "codigo_sap": "2315329390",                                 │
│        "cantidad": 3,                                               │
│        "precio_unitario_usd": 4500 }                               │
│    ],                                                               │
│    "condiciones_pago": "30 días",                                  │
│    "condiciones_garantia": "1 año",                                │
│    "observaciones": "..."                                          │
│  }                                                                  │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FastAPI — ExcelService (openpyxl)                                 │
│  1. Descarga template base desde MinIO (templates/cotizacion.xlsx) │
│  2. Inyecta datos en celdas mapeadas                               │
│  3. Calcula subtotal, IVA 19%, total                               │
│  4. Sube archivo generado a MinIO                                  │
│     (quotations/YYYY/MM/OPEX-{numero}.xlsx)                        │
│  5. Guarda registro en PostgreSQL (quotations + quotation_items)   │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Respuesta al usuario                                               │
│  { "quotation_id": 42,                                             │
│    "numero": "OPEX-2026-042",                                      │
│    "download_url": "/api/quotations/42/download",                  │
│    "items": [...],                                                  │
│    "total_usd": 13500 }                                            │
└─────────────────────────────────────────────────────────────────────┘
```

### System Prompt para DeepSeek

```
Eres un asistente de ventas especializado en baterías industriales HOPPECKE 
para la empresa OPEX SAS Colombia. 

CATÁLOGO DISPONIBLE (JSON):
{catalog_json}

INSTRUCCIONES:
- Analiza el requerimiento del cliente y selecciona los productos más adecuados del catálogo.
- Devuelve ÚNICAMENTE un JSON válido con el siguiente esquema:
  {
    "items": [{"referencia_usa": str, "modelo": str, "codigo_sap": str,
               "marca": str, "cantidad": int, "precio_unitario_usd": float}],
    "condiciones_entrega": str,
    "condiciones_pago": str,
    "condiciones_garantia": str,
    "validez_oferta": str,
    "observaciones": str
  }
- Si el requerimiento es ambiguo, sugiere la opción más cercana e indica en "observaciones".
- Los precios deben tomarse del catálogo. Si el precio no está definido, usa 0 e indica en observaciones.
```

---

## 4. Infraestructura Docker

### Contenedores

```yaml
# docker-compose.yml (vista lógica)

services:

  db:               # PostgreSQL 15-alpine
    image: postgres:15-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    env: POSTGRES_DB=aura, POSTGRES_USER, POSTGRES_PASSWORD

  minio:            # MinIO object storage
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    volumes: [minio_data:/data]
    ports: [9000, 9001]  # API y Console
    # Buckets iniciales: templates/, quotations/, exports/

  backend:          # FastAPI + Uvicorn
    build: ./backend
    depends_on: [db, minio]
    env: DATABASE_URL, MINIO_ENDPOINT, DEEPSEEK_API_KEY
    ports: [8000]

  frontend:         # React + Vite + Tailwind
    build: ./frontend
    depends_on: [backend]
    ports: [3000]

  # Opcional Etapa 2+:
  # redis + celery-worker para generación de cotizaciones asíncrona
```

### Estructura de MinIO

```
minio/
├── templates/
│   └── cotizacion_base.xlsx          # Template convertido a .xlsx
├── quotations/
│   └── 2026/04/
│       └── OPEX-2026-042.xlsx        # Cotizaciones generadas
└── exports/
    └── crm_migration_2026-04-11.xlsx # Exports de datos
```

---

## 5. Stack Tecnológico

| Capa | Tecnología | Motivo |
|------|-----------|--------|
| Base de datos | PostgreSQL 15 | Relacional, robusto, soporta generadas (GENERATED ALWAYS) |
| ORM / Migrations | SQLAlchemy + Alembic | Estándar FastAPI, versionado de esquema |
| Backend | FastAPI (Python 3.11) | Rápido, async, OpenAPI automático |
| Validación | Pydantic v2 | Tipos estrictos en endpoints |
| Storage | MinIO | S3-compatible, self-hosted, Docker-friendly |
| Excel generation | openpyxl | Sin dependencias de Microsoft Office |
| IA | DeepSeek API (`deepseek-chat`) | Costo bajo, contexto largo para catálogos |
| Frontend | React 18 + Vite + Tailwind CSS | Build rápido, Tailwind ideal para dashboards |
| Estado global | Zustand | Ligero, sin Redux overhead |
| HTTP client | Axios | Con interceptores para JWT |
| Containerización | Docker + Docker Compose | Todo en un solo `docker compose up` |

---

## 6. Estructura de Directorios del Proyecto

```
aura/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       ├── 001_initial_schema.py
│   │       └── 002_seed_products.py
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models/          # SQLAlchemy models
│       ├── schemas/         # Pydantic schemas
│       ├── routers/
│       │   ├── companies.py
│       │   ├── contacts.py
│       │   ├── opportunities.py
│       │   ├── quotations.py
│       │   ├── products.py
│       │   └── leads.py
│       └── services/
│           ├── quotation_service.py   # Orquestador IA + Excel
│           ├── deepseek_service.py    # Llamada a DeepSeek API
│           ├── excel_service.py       # openpyxl, rellena template
│           └── minio_service.py       # Upload/download MinIO
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── pages/
        │   ├── Dashboard.tsx          # KPIs por mercado
        │   ├── Pipeline.tsx           # Kanban/lista de oportunidades
        │   ├── Companies.tsx
        │   ├── Contacts.tsx
        │   ├── Quotations.tsx         # Lista + generador IA
        │   ├── QuotationGenerator.tsx # Input texto → preview → descarga
        │   ├── Products.tsx           # Catálogo HOPPECKE
        │   └── Leads.tsx              # CRM Fertilizantes
        ├── components/
        │   ├── KPICard.tsx
        │   ├── PipelineKanban.tsx
        │   └── QuotationPreview.tsx
        └── store/
            └── useAppStore.ts         # Zustand
```

---

## 7. Plan de Desarrollo (Roadmap)

### Etapa 1 — Infraestructura y Base de Datos
**Entregable:** `docker compose up` levanta todos los servicios; base de datos con esquema y datos sembrados.

- [ ] `docker-compose.yml` con postgres, minio, backend (stub), frontend (stub)
- [ ] `.env.example` con todas las variables
- [ ] Alembic: migración inicial con todas las tablas
- [ ] Alembic: seed con los 35 productos HOPPECKE del catálogo
- [ ] Script de migración: importar `CRM_OPEX_2026.xlsx` (Oportunidades, Empresas)
- [ ] Script de migración: importar `CRM_Desarrollo_Mercado.xlsx` (104 Leads)
- [ ] Bucket MinIO `templates/` con `cotizacion_base.xlsx` (template convertido)

### Etapa 2 — Backend Base (APIs CRUD)
**Entregable:** API REST completa documentada en `/docs` (Swagger).

- [ ] `GET/POST/PUT/DELETE /api/companies`
- [ ] `GET/POST/PUT/DELETE /api/contacts`
- [ ] `GET/POST/PUT/DELETE /api/opportunities`
- [ ] `GET/POST/PUT/DELETE /api/products` (catálogo con precios editables)
- [ ] `GET/POST/PUT/DELETE /api/leads` (Fertilizantes)
- [ ] `GET /api/dashboard/kpis` — resumen por mercado y mes
- [ ] `GET/POST /api/exchange-rates` — gestión de tipos de cambio

### Etapa 3 — Motor de Cotización con IA
**Entregable:** Input de texto → cotización Excel descargable en < 10 segundos.

- [ ] `POST /api/quotations/generate` — orquestador completo
- [ ] `DeepSeekService`: llamada a API con catálogo como contexto
- [ ] `ExcelService`: rellena celdas mapeadas con openpyxl
- [ ] `MinIOService`: upload/download presigned URLs
- [ ] `GET /api/quotations/{id}/download` — descarga Excel generado
- [ ] `GET /api/quotations` — listado con filtros
- [ ] Manejo de errores IA: fallback a cotización manual si DeepSeek falla

### Etapa 4 — Frontend React
**Entregable:** Aplicación web usable para el equipo comercial.

- [ ] Layout base con sidebar (Tailwind)
- [ ] Dashboard con KPICards (Cotizaciones, Órdenes, Facturación por mercado)
- [ ] Pipeline view: lista de oportunidades con filtros por etapa/mercado/asesor
- [ ] Formulario de Empresa + Contacto
- [ ] **Generador de Cotizaciones**: textarea input → llamada a API → preview en tabla → botón descarga Excel
- [ ] Catálogo de productos con buscador y editor de precios
- [ ] Módulo Leads (Fertilizantes) con kanban de etapas

---

## 8. Variables de Entorno Requeridas

```bash
# Base de datos
POSTGRES_DB=aura
POSTGRES_USER=aura_user
POSTGRES_PASSWORD=changeme
DATABASE_URL=postgresql://aura_user:changeme@db:5432/aura

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_TEMPLATES=templates
MINIO_BUCKET_QUOTATIONS=quotations

# DeepSeek
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-chat

# App
BACKEND_CORS_ORIGINS=http://localhost:3000
SECRET_KEY=changeme-jwt-secret
```

---

## 9. Decisiones de Diseño y Consideraciones

| Decisión | Elección | Alternativa descartada | Razón |
|----------|----------|------------------------|-------|
| Storage de Excel | MinIO | Filesystem local | Portabilidad, acceso desde múltiples contenedores |
| Formato template | `.xlsx` | `.xls` original | `openpyxl` solo soporta `.xlsx`; hay que convertir una vez |
| IA | DeepSeek | OpenAI GPT-4 | Mismo costo-performance, API compatible con OpenAI SDK |
| Frontend state | Zustand | Redux Toolkit | Suficiente para este scope, menos boilerplate |
| Auth | JWT simple | OAuth2 full | El sistema es interno; se puede escalar después |
| Precios en catálogo | Gestionados en DB | Leer del .xls | El .xls original no tiene precios cargados |
| Async | FastAPI BackgroundTasks | Celery + Redis | Reduce complejidad; cotización < 10s no necesita cola |

---

*Fin del documento ARCHITECTURE.md*
*Próximo paso: revisión y aprobación antes de iniciar Etapa 1.*
