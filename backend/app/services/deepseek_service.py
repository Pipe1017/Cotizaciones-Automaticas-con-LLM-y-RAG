import httpx
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)


DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

SYSTEM_PROMPT = """Eres un asistente de ventas especializado en baterías industriales HOPPECKE
para la empresa OPEX SAS Colombia. Tu función es analizar requerimientos de clientes y
seleccionar los productos más adecuados del catálogo para generar cotizaciones.

El catálogo incluye dos categorías principales:
- "traccion": baterías de tracción para montacargas y vehículos eléctricos (24V, 36V, 48V, 80V — familia HPzB, HPzS)
- "estacionaria": baterías estacionarias para UPS, solar y telecomunicaciones (familia Xgrid Xtreme OPzV — celdas 2V o módulos 12V)

CATÁLOGO DISPONIBLE:
{catalog}

INSTRUCCIONES:
- Analiza el requerimiento e identifica si se trata de una aplicación de TRACCIÓN o ESTACIONARIA.
- Para tracción: filtra por categoría "traccion", voltaje y capacidad del montacargas.
- Para estacionaria: filtra por categoría "estacionaria". Considera la tensión del banco (48V, 110V, 220V)
  y la capacidad del banco en Ah. Un banco 48V con celdas de 2V requiere 24 celdas en serie.
  Indica en la descripción el número de celdas necesarias y la configuración.
- Si el cliente menciona capacidad, selecciona el producto con capacidad igual o inmediatamente superior.
- Si hay ambigüedad, elige la opción más conservadora e indícalo en observaciones.
- Si el precio no está definido (precio_neto_usd = null o 0), usa precio_unitario_usd = 0 y anota en observaciones "Precio pendiente de confirmar con proveedor".
- Los precios deben tomarse siempre del catálogo cuando estén disponibles.
- CRÍTICO: el array "items" NUNCA debe estar vacío. Siempre selecciona el producto más adecuado aunque su precio sea 0 o null.
- Si no hay un producto exacto, elige el más cercano por voltaje y capacidad.

Responde ÚNICAMENTE con un JSON válido (sin texto adicional, sin markdown) con este esquema exacto:
{{
  "items": [
    {{
      "referencia_usa": "string",
      "descripcion": "string (modelo completo HOPPECKE con configuración si aplica)",
      "referencia_cod_proveedor": "string (código SAP si existe, sino vacío)",
      "marca": "HOPPECKE",
      "cantidad": number,
      "precio_unitario_usd": number
    }}
  ],
  "condiciones_entrega": "string",
  "condiciones_pago": "string",
  "condiciones_garantia": "string",
  "validez_oferta": "string",
  "observaciones": "string"
}}"""


async def generate_quotation_items(prompt: str, catalog_json: str) -> dict:
    system = SYSTEM_PROMPT.format(catalog=catalog_json)

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            DEEPSEEK_API_URL,
            headers={
                "Authorization": f"Bearer {settings.deepseek_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.deepseek_model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
            },
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        result = json.loads(content)
        logger.info("DeepSeek response items: %d", len(result.get("items", [])))
        return result
