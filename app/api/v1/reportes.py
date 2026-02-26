"""
KONTAX - Reportes Endpoints: CRUD + Generación
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.models.reporte import Reporte as ReporteModel
from app.models.asiento_verde import AsientoVerde as AsientoModel
from app.schemas.reporte import Reporte, ReporteCreate, ReporteList
from app.api.deps import get_current_user, require_contador

router = APIRouter()


@router.get("/", response_model=List[ReporteList])
async def list_reportes(
    entity_id: Optional[UUID] = None,
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Listar reportes con filtros"""
    query = db.query(ReporteModel)

    if entity_id:
        query = query.filter(ReporteModel.entity_id == entity_id)
    if tipo:
        query = query.filter(ReporteModel.tipo == tipo)
    if estado:
        query = query.filter(ReporteModel.estado == estado)

    return query.order_by(ReporteModel.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{reporte_id}", response_model=Reporte)
async def get_reporte(
    reporte_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Obtener reporte por ID con datos completos"""
    reporte = db.query(ReporteModel).filter(ReporteModel.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return reporte


@router.post("/generate", response_model=Reporte, status_code=201)
async def generate_reporte(
    data: ReporteCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(require_contador),
):
    """
    Generar nuevo reporte.

    Tipos válidos:
    - huella_carbono: Alcance 1/2/3 GHG Protocol
    - esg: Reporte ESG/ASG completo
    - ifrs_s1: IFRS S1 Sustainability
    - ifrs_s2: IFRS S2 Climate
    - ley_rep: Declaración Ley REP
    - balance_ambiental: Balance Ambiental KONTAX
    """
    tipos_validos = [
        "huella_carbono", "esg", "ifrs_s1", "ifrs_s2",
        "ley_rep", "balance_ambiental", "dashboard_ods",
    ]
    if data.tipo not in tipos_validos:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo inválido. Válidos: {tipos_validos}",
        )

    # Verificar que hay asientos para el período
    count = (
        db.query(func.count(AsientoModel.id))
        .filter(
            AsientoModel.entity_id == data.entity_id,
            AsientoModel.periodo == data.periodo,
        )
        .scalar()
    )

    if count == 0:
        raise HTTPException(
            status_code=400,
            detail=f"No hay asientos verdes para {data.periodo}",
        )

    # Crear reporte en estado generando
    reporte = ReporteModel(
        entity_id=data.entity_id,
        tipo=data.tipo,
        periodo=data.periodo,
        estado="generando",
        parametros_json=data.parametros or {},
        data_json={},
        generado_por=str(current_user.id),
    )
    db.add(reporte)
    db.commit()
    db.refresh(reporte)

    # Lanzar generación en background
    background_tasks.add_task(_generate_report_data, str(reporte.id), data.tipo)

    return reporte


async def _generate_report_data(reporte_id: str, tipo: str):
    """
    Genera datos del reporte en background.
    En producción, esto se delega a Celery.
    """
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        reporte = db.query(ReporteModel).filter(ReporteModel.id == reporte_id).first()
        if not reporte:
            return

        # Obtener asientos del período
        asientos = (
            db.query(AsientoModel)
            .filter(
                AsientoModel.entity_id == reporte.entity_id,
                AsientoModel.periodo == reporte.periodo,
                AsientoModel.estado == "validado",
            )
            .all()
        )

        if tipo == "huella_carbono":
            data = _build_huella_carbono(asientos)
        elif tipo == "balance_ambiental":
            data = _build_balance_ambiental(asientos)
        elif tipo == "esg":
            data = _build_esg(asientos)
        else:
            data = _build_generic(asientos, tipo)

        reporte.data_json = data
        reporte.estado = "completo"
        reporte.completado_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        reporte.estado = "error"
        reporte.data_json = {"error": str(e)}
        db.commit()
    finally:
        db.close()


def _build_huella_carbono(asientos) -> dict:
    """Construir reporte Huella de Carbono GHG Protocol"""
    alcance1 = sum(float(a.emisiones_tco2e or 0) for a in asientos if a.alcance_gei == 1)
    alcance2 = sum(float(a.emisiones_tco2e or 0) for a in asientos if a.alcance_gei == 2)
    alcance3 = sum(float(a.emisiones_tco2e or 0) for a in asientos if a.alcance_gei == 3)

    return {
        "estandar": "GHG Protocol Corporate Standard",
        "alcance_1": {"total_tco2e": round(alcance1, 3), "fuentes": "Combustión directa, vehículos propios"},
        "alcance_2": {"total_tco2e": round(alcance2, 3), "fuentes": "Electricidad comprada"},
        "alcance_3": {"total_tco2e": round(alcance3, 3), "fuentes": "Transporte terceros, residuos, cadena valor"},
        "total_tco2e": round(alcance1 + alcance2 + alcance3, 3),
        "asientos_procesados": len(asientos),
    }


def _build_balance_ambiental(asientos) -> dict:
    """Construir Balance Ambiental KONTAX"""
    activos = sum(float(a.monto_debe or 0) for a in asientos if str(a.cuenta_debe or "").startswith("1595"))
    pasivos = sum(float(a.monto_haber or 0) for a in asientos if str(a.cuenta_haber or "").startswith("2630"))
    costos = sum(float(a.monto_debe or 0) for a in asientos if str(a.cuenta_debe or "").startswith("5190"))

    return {
        "activos_ambientales_clp": round(activos, 2),
        "pasivos_ambientales_clp": round(pasivos, 2),
        "costos_ambientales_clp": round(costos, 2),
        "patrimonio_ambiental_neto_clp": round(activos - pasivos, 2),
        "asientos_procesados": len(asientos),
    }


def _build_esg(asientos) -> dict:
    """Construir reporte ESG básico"""
    total_emisiones = sum(float(a.emisiones_tco2e or 0) for a in asientos)
    total_energia = sum(
        float(a.cantidad_fisica or 0)
        for a in asientos
        if a.tipo and "energia" in a.tipo
    )

    return {
        "estandar": "GRI / SASB",
        "ambiental": {
            "emisiones_totales_tco2e": round(total_emisiones, 3),
            "consumo_energia_kwh": round(total_energia, 2),
        },
        "social": {"nota": "Requiere datos adicionales no contables"},
        "gobernanza": {"nota": "Requiere datos adicionales corporativos"},
        "asientos_procesados": len(asientos),
    }


def _build_generic(asientos, tipo) -> dict:
    """Reporte genérico para tipos aún no implementados completamente"""
    return {
        "tipo": tipo,
        "asientos_procesados": len(asientos),
        "total_emisiones_tco2e": round(
            sum(float(a.emisiones_tco2e or 0) for a in asientos), 3
        ),
        "estado": "generado_basico",
        "nota": f"Reporte {tipo} generado con datos básicos de asientos verdes",
    }
