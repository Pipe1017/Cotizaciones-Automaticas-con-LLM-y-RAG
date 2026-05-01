"""
Inicializa los buckets de MinIO y sube el template de cotización.
El archivo cotizacion_base.xlsx ya está pre-convertido en este mismo directorio.

Uso:
    cd backend
    python -m scripts.setup_minio
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from minio import Minio
from io import BytesIO
from app.config import settings

# El .xlsx pre-convertido vive junto a este script
TEMPLATE_XLSX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cotizacion_base.xlsx")

BUCKETS = [
    settings.minio_bucket_templates,
    settings.minio_bucket_quotations,
    settings.minio_bucket_exports,
    "products",
]


def run():
    client = Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )

    for bucket in BUCKETS:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            print(f"  Bucket creado: {bucket}")
        else:
            print(f"  Bucket ya existe: {bucket}")

    with open(TEMPLATE_XLSX, "rb") as f:
        data = f.read()

    client.put_object(
        settings.minio_bucket_templates,
        "cotizacion_base.xlsx",
        BytesIO(data),
        length=len(data),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    print("  Template subido: templates/cotizacion_base.xlsx")
    print("Setup MinIO completado.")


if __name__ == "__main__":
    run()
