import httpx
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)

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

REGLAS CRÍTICAS — NO NEGOCIABLES:
1. SOLO puedes seleccionar productos que existan en el catálogo. NO inventes modelos, referencias ni precios.
2. El campo "referencia_usa" debe ser EXACTAMENTE igual al campo "referencia_usa" del catálogo.
3. El campo "precio_unitario_usd" debe ser EXACTAMENTE el campo "precio_neto_usd" del catálogo.
4. Si precio_neto_usd es null, usa 0 y anota "Precio pendiente de confirmar con proveedor" en observaciones.
5. El array "items" NUNCA debe estar vacío. Si no hay coincidencia exacta, elige el más cercano por voltaje y capacidad.
6. Si inventas un modelo que no existe en el catálogo, estás cometiendo un error grave.

Responde ÚNICAMENTE con un JSON válido (sin texto adicional, sin markdown) con este esquema exacto:
{{
  "razonamiento": "string (1-3 frases explicando por qué elegiste estos productos: qué identificaste del requerimiento, qué criterios usaste, qué supustos hiciste si faltaba info)",
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


def _build_request_body(prompt: str, catalog_json: str) -> dict:
    body: dict = {
        "model": settings.deepseek_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT.format(catalog=catalog_json)},
            {"role": "user",   "content": prompt},
        ],
        "temperature": 0.1,
    }

    if settings.deepseek_use_reasoning:
        # deepseek-reasoner no soporta response_format — el JSON viene en content
        body["reasoning_effort"] = settings.deepseek_reasoning_effort
    else:
        body["response_format"] = {"type": "json_object"}

    return body


def _extract_result(response_json: dict) -> tuple[dict, str | None]:
    """Retorna (items_dict, razonamiento | None)."""
    choice = response_json["choices"][0]["message"]
    content = choice.get("content", "")
    result = json.loads(content)
    reasoning = result.pop("razonamiento", None)
    return result, reasoning


async def generate_quotation_items(prompt: str, catalog_json: str) -> dict:
    """
    Llama a DeepSeek y retorna el dict con items + condiciones.
    También incluye 'reasoning' si el modelo lo devuelve.
    """
    url = f"{settings.deepseek_base_url.rstrip('/')}/v1/chat/completions"
    body = _build_request_body(prompt, catalog_json)

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {settings.deepseek_api_key}",
                "Content-Type": "application/json",
            },
            json=body,
        )

        if response.status_code != 200:
            logger.error("DeepSeek error %s: %s", response.status_code, response.text[:500])
            response.raise_for_status()

        data = response.json()

    result, reasoning = _extract_result(data)
    logger.info("DeepSeek response — items=%d reasoning_chars=%s",
                len(result.get("items", [])),
                len(reasoning) if reasoning else "none")

    if reasoning:
        result["_reasoning"] = reasoning

    return result
