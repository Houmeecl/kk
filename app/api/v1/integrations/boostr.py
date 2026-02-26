"""
KONTAX - Integración Boostr Endpoints (Vehículos)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.models.vehiculo import Vehiculo as VehiculoModel
from app.integrations.boostr_client import BoostrClient
from app.api.deps import get_current_user
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

router = APIRouter()


class VehiculoResponse(BaseModel):
    id: UUID
    patente: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    ano: Optional[int] = None
    tipo_combustible: Optional[str] = None
    rendimiento_km_l: Optional[Decimal] = None
    factor_emision: Optional[Decimal] = None

    class Config:
        from_attributes = True


@router.get("/vehiculo/{patente}", response_model=VehiculoResponse)
async def lookup_vehiculo(
    patente: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Buscar vehículo por patente.
    Primero busca en cache local, si no existe consulta Boostr API.
    """
    # Buscar en cache
    vehiculo = (
        db.query(VehiculoModel).filter(VehiculoModel.patente == patente.upper()).first()
    )

    if vehiculo:
        return vehiculo

    # Consultar Boostr API
    try:
        client = BoostrClient()
        data = await client.consultar_vehiculo(patente)

        if not data:
            raise HTTPException(
                status_code=404, detail=f"Vehículo {patente} no encontrado en Boostr"
            )

        # Guardar en cache
        vehiculo = VehiculoModel(
            patente=patente.upper(),
            marca=data.get("marca"),
            modelo=data.get("modelo"),
            ano=data.get("ano"),
            tipo_combustible=data.get("tipo_combustible"),
            rendimiento_km_l=data.get("rendimiento_km_l"),
            factor_emision=data.get("factor_emision"),
        )
        db.add(vehiculo)
        db.commit()
        db.refresh(vehiculo)

        return vehiculo
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error consultando Boostr: {e}")


@router.get("/vehiculos/{entity_id}")
async def list_vehiculos_entity(
    entity_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Listar vehículos asociados a una entidad"""
    vehiculos = (
        db.query(VehiculoModel)
        .filter(VehiculoModel.entity_id == entity_id)
        .all()
    )
    return vehiculos
