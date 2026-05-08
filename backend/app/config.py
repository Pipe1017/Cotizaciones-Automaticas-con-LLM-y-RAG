from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://aura_user:changeme@localhost:5432/aura"

    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin123"
    minio_bucket_templates: str = "templates"
    minio_bucket_quotations: str = "quotations"
    minio_bucket_exports: str = "exports"
    minio_secure: bool = False

    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-v4-pro"
    deepseek_reasoning_effort: str = "medium"   # low | medium | high
    deepseek_use_reasoning: bool = False         # activa thinking/reasoning en modelos que lo soportan

    secret_key: str = "change-this-secret"
    backend_cors_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
