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

    def ensure_bucket(self, bucket: str) -> None:
        if not self.client.bucket_exists(bucket):
            self.client.make_bucket(bucket)

    def ensure_all_buckets(self) -> None:
        for bucket in (
            settings.minio_bucket_templates,
            settings.minio_bucket_quotations,
            settings.minio_bucket_exports,
        ):
            self.ensure_bucket(bucket)

    def download(self, object_path: str) -> bytes:
        """Download file from MinIO. object_path = 'bucket/path/file.xlsx'"""
        parts = object_path.split("/", 1)
        bucket, obj = parts[0], parts[1]
        response = self.client.get_object(bucket, obj)
        data = response.read()
        response.close()
        return data

    def upload(self, bucket: str, object_name: str, data: bytes, content_type: str) -> str:
        """Upload bytes to MinIO. Creates bucket if it doesn't exist."""
        self.ensure_bucket(bucket)
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
