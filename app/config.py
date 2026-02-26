"""
ConfiguraciÃ³n KONTAX API
"""
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Settings de la aplicaciÃ³n"""
    
    # App
    APP_NAME: str = "KONTAX API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str
    DATABASE_ECHO: bool = False
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # RabbitMQ
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672"
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # SII Chile
    SII_API_URL: str = "https://api.sii.cl/recursos/v1"
    SII_TIMEOUT: int = 30
    
    # Boostr
    BOOSTR_API_URL: str = "https://api.boostr.cl/v1"
    BOOSTR_API_KEY: str
    
    # MinIO S3
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET_EVIDENCIAS: str = "kontax-evidencias"
    MINIO_BUCKET_REPORTES: str = "kontax-reportes"
    
    # Email (Resend)
    RESEND_API_KEY: str
    EMAIL_FROM: str = "noreply@kontax.cl"
    
    # Directus
    DIRECTUS_URL: str = "http://localhost:8055"
    DIRECTUS_TOKEN: str
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "https://kontax.cl",
        "https://app.kontax.cl",
    ]
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    # Factores Ambientales
    MMA_FACTORES_VERSION: str = "2026_v2.1"
    PRECIO_CARBONO_CLP: int = 25000  # CLP por tCO2e
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings"""
    return Settings()


settings = get_settings()
