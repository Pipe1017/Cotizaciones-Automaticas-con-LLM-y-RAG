from io import BytesIO
from minio import Minio
from app.config import settings


class MinioService:
    def __init__(self):
        self.client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )

    def download(self, object_path: str) -> bytes:
        """Download file from MinIO. object_path = 'bucket/path/file.xlsx'"""
        parts = object_path.split("/", 1)
        bucket, obj = parts[0], parts[1]
        response = self.client.get_object(bucket, obj)
        data = response.read()
        response.close()
        return data

    def upload(self, bucket: str, object_name: str, data: bytes, content_type: str) -> str:
        """Upload bytes to MinIO. Returns the full object path."""
        self.client.put_object(
            bucket,
            object_name,
            BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
        return f"{bucket}/{object_name}"

    def get_template(self) -> bytes:
        return self.download(f"{settings.minio_bucket_templates}/cotizacion_base.xlsx")
