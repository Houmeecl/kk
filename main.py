"""
KONTAX API - FastAPI Application
Primer Estudio Contable Ambiental de Chile
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.core.database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting KONTAX API...")
    init_db()
    logger.info("Database initialized")
    yield
    logger.info("Shutting down KONTAX API...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API contabilidad ambiental profesional",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.DEBUG else "An error occurred",
        },
    )


@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}


# ═══ ROUTERS ═══
from app.api.v1 import auth, entities, asientos, reportes, evidencias, factores, financiamiento, ai, valorizador
from app.api.v1.integrations import sii as sii_integration, boostr as boostr_integration

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(valorizador.router, prefix="/api/v1/valorizador", tags=["valorizador"])
app.include_router(entities.router, prefix="/api/v1/entities", tags=["entities"])
app.include_router(asientos.router, prefix="/api/v1/asientos", tags=["asientos-verdes"])
app.include_router(reportes.router, prefix="/api/v1/reportes", tags=["reportes"])
app.include_router(evidencias.router, prefix="/api/v1/evidencias", tags=["evidencias"])
app.include_router(factores.router, prefix="/api/v1/factores", tags=["factores-mma"])
app.include_router(financiamiento.router, prefix="/api/v1/financiamiento", tags=["financiamiento-verde"])
app.include_router(sii_integration.router, prefix="/api/v1/integrations/sii", tags=["integrations-sii"])
app.include_router(boostr_integration.router, prefix="/api/v1/integrations/boostr", tags=["integrations-boostr"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["ai"])



@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "auth": "/api/v1/auth",
            "entities": "/api/v1/entities",
            "asientos": "/api/v1/asientos",
            "reportes": "/api/v1/reportes",
            "evidencias": "/api/v1/evidencias",
            "factores": "/api/v1/factores",
            "financiamiento": "/api/v1/financiamiento",
            "sii": "/api/v1/integrations/sii",
            "boostr": "/api/v1/integrations/boostr",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)
