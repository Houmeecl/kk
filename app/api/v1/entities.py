"""
Entities (Empresas) Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.models.entity import Entity as EntityModel
from app.schemas.entity import Entity, EntityCreate, EntityUpdate
from app.api.deps import get_current_user, require_admin

router = APIRouter()


@router.post("/", response_model=Entity, status_code=201)
async def create_entity(
    entity_data: EntityCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    Crear nueva entidad (empresa)
    
    Requiere rol: admin
    """
    # Verificar RUT Ãºnico
    existing = db.query(EntityModel).filter(
        EntityModel.rut == entity_data.rut
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"RUT {entity_data.rut} ya existe"
        )
    
    # Crear entity
    db_entity = EntityModel(**entity_data.model_dump())
    
    db.add(db_entity)
    db.commit()
    db.refresh(db_entity)
    
    return db_entity


@router.get("/", response_model=List[Entity])
async def list_entities(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sector: str = None,
    estado: str = None,
    sync_sii: bool = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Listar entidades
    
    Filtros:
    - sector: manufactura, mineria, inmobiliaria, etc
    - estado: activo, suspendido, cancelado
    - sync_sii: true para obtener solo las que requieren sync
    """
    query = db.query(EntityModel)
    
    # Si no es admin, solo ve su propia entity
    if current_user.rol != "admin":
        query = query.filter(EntityModel.id == current_user.entity_id)
    
    # Filtros
    if sector:
        query = query.filter(EntityModel.sector == sector)
    
    if estado:
        query = query.filter(EntityModel.estado == estado)
    
    if sync_sii is True:
        query = query.filter(EntityModel.sii_configurado == True)
    
    # PaginaciÃ³n
    entities = query.offset(skip).limit(limit).all()
    
    return entities


@router.get("/{entity_id}", response_model=Entity)
async def get_entity(
    entity_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obtener entidad por ID
    """
    entity = db.query(EntityModel).filter(EntityModel.id == entity_id).first()
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entity no encontrada")
    
    # Verificar permiso
    if current_user.rol != "admin" and current_user.entity_id != entity_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    return entity


@router.patch("/{entity_id}", response_model=Entity)
async def update_entity(
    entity_id: UUID,
    entity_data: EntityUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    Actualizar entidad
    
    Requiere rol: admin
    """
    entity = db.query(EntityModel).filter(EntityModel.id == entity_id).first()
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entity no encontrada")
    
    # Actualizar campos
    update_data = entity_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(entity, key, value)
    
    db.commit()
    db.refresh(entity)
    
    return entity


@router.delete("/{entity_id}", status_code=204)
async def delete_entity(
    entity_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    Eliminar entidad
    
    Requiere rol: admin
    """
    entity = db.query(EntityModel).filter(EntityModel.id == entity_id).first()
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entity no encontrada")
    
    db.delete(entity)
    db.commit()
    
    return None
