"""
Asientos Verdes Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.models.asiento_verde import AsientoVerde as AsientoModel
from app.schemas.asiento_verde import (
    AsientoVerde,
    AsientoVerdeCreate,
    AsientoVerdeList
)
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=AsientoVerde, status_code=201)
async def create_asiento_verde(
    asiento_data: AsientoVerdeCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Crear nuevo asiento verde
    
    Generalmente creado automÃ¡ticamente por sistema,
    pero permite creaciÃ³n manual.
    """
    # Verificar permiso entity
    if current_user.rol != "admin" and current_user.entity_id != asiento_data.entity_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Calcular perÃ­odo YYYY-MM
    periodo = asiento_data.fecha.strftime("%Y-%m")
    
    # Crear asiento
    db_asiento = AsientoModel(
        **asiento_data.model_dump(),
        periodo=periodo,
        creado_por=current_user.email,
        estado="confirmado"
    )
    
    db.add(db_asiento)
    db.commit()
    db.refresh(db_asiento)
    
    return db_asiento


@router.get("/", response_model=AsientoVerdeList)
async def list_asientos_verdes(
    entity_id: UUID,
    periodo: Optional[str] = Query(None, regex=r"^\d{4}-\d{2}$"),
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    categoria: Optional[str] = None,
    tipo: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Listar asientos verdes con filtros
    
    Filtros:
    - periodo: YYYY-MM
    - fecha_desde / fecha_hasta: Rango fechas
    - categoria: energia, combustible, agua, etc
    - tipo: consumo_energia, transporte, etc
    """
    # Verificar permiso
    if current_user.rol != "admin" and current_user.entity_id != entity_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Query base
    query = db.query(AsientoModel).filter(
        AsientoModel.entity_id == entity_id,
        AsientoModel.estado == "confirmado"
    )
    
    # Filtros
    if periodo:
        query = query.filter(AsientoModel.periodo == periodo)
    
    if fecha_desde:
        query = query.filter(AsientoModel.fecha >= fecha_desde)
    
    if fecha_hasta:
        query = query.filter(AsientoModel.fecha <= fecha_hasta)
    
    if categoria:
        query = query.filter(AsientoModel.categoria == categoria)
    
    if tipo:
        query = query.filter(AsientoModel.tipo == tipo)
    
    # Total count
    total = query.count()
    
    # PaginaciÃ³n
    skip = (page - 1) * page_size
    items = query.order_by(AsientoModel.fecha.desc()).offset(skip).limit(page_size).all()
    
    # Calcular pÃ¡ginas
    pages = (total + page_size - 1) // page_size
    
    return AsientoVerdeList(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )


@router.get("/stats", response_model=dict)
async def get_asientos_stats(
    entity_id: UUID,
    periodo: str = Query(..., regex=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    EstadÃ­sticas de asientos verdes para perÃ­odo
    """
    # Verificar permiso
    if current_user.rol != "admin" and current_user.entity_id != entity_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Consultas agregadas
    stats = db.query(
        func.count(AsientoModel.id).label("total_asientos"),
        func.sum(AsientoModel.emisiones_tco2e).label("emisiones_totales"),
        func.sum(AsientoModel.consumo_agua_m3).label("consumo_agua_total"),
        func.sum(AsientoModel.residuos_kg).label("residuos_totales"),
        func.sum(AsientoModel.debe_monto).label("pasivos_totales"),
        func.sum(AsientoModel.haber_monto).label("activos_totales"),
    ).filter(
        AsientoModel.entity_id == entity_id,
        AsientoModel.periodo == periodo,
        AsientoModel.estado == "confirmado"
    ).first()
    
    # Por categorÃ­a
    por_categoria = db.query(
        AsientoModel.categoria,
        func.count(AsientoModel.id).label("count"),
        func.sum(AsientoModel.emisiones_tco2e).label("emisiones")
    ).filter(
        AsientoModel.entity_id == entity_id,
        AsientoModel.periodo == periodo,
        AsientoModel.estado == "confirmado"
    ).group_by(AsientoModel.categoria).all()
    
    # Por alcance GEI
    por_alcance = db.query(
        AsientoModel.alcance_gei,
        func.sum(AsientoModel.emisiones_tco2e).label("emisiones")
    ).filter(
        AsientoModel.entity_id == entity_id,
        AsientoModel.periodo == periodo,
        AsientoModel.estado == "confirmado",
        AsientoModel.alcance_gei.isnot(None)
    ).group_by(AsientoModel.alcance_gei).all()
    
    return {
        "periodo": periodo,
        "totales": {
            "asientos": stats.total_asientos or 0,
            "emisiones_tco2e": float(stats.emisiones_totales or 0),
            "agua_m3": float(stats.consumo_agua_total or 0),
            "residuos_kg": float(stats.residuos_totales or 0),
            "pasivos_clp": float(stats.pasivos_totales or 0),
            "activos_clp": float(stats.activos_totales or 0),
        },
        "por_categoria": [
            {
                "categoria": cat.categoria,
                "asientos": cat.count,
                "emisiones_tco2e": float(cat.emisiones or 0)
            }
            for cat in por_categoria
        ],
        "por_alcance_gei": [
            {
                "alcance": alc.alcance_gei,
                "emisiones_tco2e": float(alc.emisiones or 0)
            }
            for alc in por_alcance
        ]
    }


@router.get("/{asiento_id}", response_model=AsientoVerde)
async def get_asiento_verde(
    asiento_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obtener asiento verde por ID con evidencia vinculada
    """
    asiento = db.query(AsientoModel).filter(
        AsientoModel.id == asiento_id
    ).first()
    
    if not asiento:
        raise HTTPException(status_code=404, detail="Asiento no encontrado")
    
    # Verificar permiso
    if current_user.rol != "admin" and current_user.entity_id != asiento.entity_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    return asiento
