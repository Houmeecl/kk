"""
KONTAX - Integración SII Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.models.entity import Entity as EntityModel
from app.services.sii_service import SIIService
from app.api.deps import get_current_user, require_contador
from pydantic import BaseModel
from typing import Optional
from datetime import date

router = APIRouter()


class SyncRequest(BaseModel):
    entity_id: UUID
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None


class SyncResponse(BaseModel):
    message: str
    entity_id: str
    status: str


@router.post("/sync", response_model=SyncResponse)
async def sync_sii(
    data: SyncRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(require_contador),
):
    """
    Sincronizar DTEs desde SII para una entidad.
    Ejecuta en background: descarga → parsea → clasifica → genera asientos.
    """
    entity = db.query(EntityModel).filter(EntityModel.id == data.entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    if not entity.sii_token:
        raise HTTPException(
            status_code=400,
            detail="Entidad no tiene token SII configurado",
        )

    # Lanzar sync en background
    background_tasks.add_task(
        _run_sii_sync,
        str(entity.id),
        data.fecha_desde,
        data.fecha_hasta,
    )

    return SyncResponse(
        message="Sincronización SII iniciada",
        entity_id=str(entity.id),
        status="processing",
    )


async def _run_sii_sync(entity_id: str, fecha_desde, fecha_hasta):
    """Ejecutar sincronización SII en background"""
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        service = SIIService(db)
        service.sincronizar_entity(entity_id, fecha_desde, fecha_hasta)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error sync SII {entity_id}: {e}")
    finally:
        db.close()


@router.get("/status/{entity_id}")
async def sii_status(
    entity_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Estado de la integración SII para una entidad"""
    entity = db.query(EntityModel).filter(EntityModel.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    return {
        "entity_id": str(entity.id),
        "rut": entity.rut,
        "sii_configured": bool(entity.sii_token),
        "last_sync": str(entity.config_json.get("last_sii_sync", "never"))
        if entity.config_json
        else "never",
    }
