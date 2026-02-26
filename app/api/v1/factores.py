"""
KONTAX - Factores MMA Endpoints: Catálogo factores de emisión
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date

from app.core.database import get_db
from app.models.factor import Factor as FactorModel
from app.api.deps import get_current_user, require_admin
from pydantic import BaseModel
from decimal import Decimal


class FactorResponse(BaseModel):
    id: UUID
    key: str
    categoria: str
    unidad_entrada: str
    unidad_salida: str
    valor: Decimal
    fuente_oficial: Optional[str] = None
    vigencia_desde: Optional[date] = None
    vigencia_hasta: Optional[date] = None
    version: int

    class Config:
        from_attributes = True


class FactorCreate(BaseModel):
    key: str
    categoria: str
    unidad_entrada: str
    unidad_salida: str
    valor: Decimal
    fuente_oficial: Optional[str] = None
    vigencia_desde: Optional[date] = None
    vigencia_hasta: Optional[date] = None


router = APIRouter()


@router.get("/", response_model=List[FactorResponse])
async def list_factores(
    categoria: Optional[str] = None,
    vigente: bool = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Listar factores de emisión MMA.

    Categorías: energia, combustible, transporte, agua, residuo, biodiversidad
    """
    query = db.query(FactorModel)

    if categoria:
        query = query.filter(FactorModel.categoria == categoria)

    if vigente:
        today = date.today()
        query = query.filter(
            FactorModel.vigencia_desde <= today,
            (FactorModel.vigencia_hasta >= today) | (FactorModel.vigencia_hasta.is_(None)),
        )

    return query.order_by(FactorModel.categoria, FactorModel.key).offset(skip).limit(limit).all()


@router.get("/lookup/{key}", response_model=FactorResponse)
async def lookup_factor(
    key: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Buscar factor por key exacta.
    Ejemplo: electricidad_sen_2026_q1
    """
    factor = (
        db.query(FactorModel)
        .filter(FactorModel.key == key)
        .order_by(FactorModel.version.desc())
        .first()
    )
    if not factor:
        raise HTTPException(status_code=404, detail=f"Factor '{key}' no encontrado")
    return factor


@router.get("/categorias")
async def list_categorias(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Listar categorías disponibles con conteo de factores"""
    results = (
        db.query(
            FactorModel.categoria,
            func.count(FactorModel.id).label("total"),
        )
        .group_by(FactorModel.categoria)
        .all()
    )
    return [{"categoria": r[0], "total_factores": r[1]} for r in results]


@router.post("/", response_model=FactorResponse, status_code=201)
async def create_factor(
    data: FactorCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """
    Crear nuevo factor de emisión.
    Si la key ya existe, crea nueva versión.
    Requiere rol: admin
    """
    # Buscar versión existente
    existing = (
        db.query(FactorModel)
        .filter(FactorModel.key == data.key)
        .order_by(FactorModel.version.desc())
        .first()
    )

    new_version = (existing.version + 1) if existing else 1

    factor = FactorModel(
        key=data.key,
        categoria=data.categoria,
        unidad_entrada=data.unidad_entrada,
        unidad_salida=data.unidad_salida,
        valor=data.valor,
        fuente_oficial=data.fuente_oficial,
        vigencia_desde=data.vigencia_desde or date.today(),
        vigencia_hasta=data.vigencia_hasta,
        version=new_version,
    )

    db.add(factor)
    db.commit()
    db.refresh(factor)

    return factor


# Import at module level for categorias endpoint
from sqlalchemy import func
