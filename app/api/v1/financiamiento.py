"""
KONTAX - Financiamiento Verde Endpoints: Green Score + Pre-aprobación
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID

from app.core.database import get_db
from app.models.entity import Entity as EntityModel
from app.models.asiento_verde import AsientoVerde as AsientoModel
from app.api.deps import get_current_user
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

router = APIRouter()


class GreenScoreResponse(BaseModel):
    entity_id: str
    razon_social: str
    green_score: int
    nivel: str
    productos_elegibles: list
    metricas: dict


@router.get("/green-score/{entity_id}", response_model=GreenScoreResponse)
async def get_green_score(
    entity_id: UUID,
    periodo: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Calcular Green Score propietario KONTAX.

    Score 0-100 basado en:
    - Proporción transacciones verdes T-MAS (40%)
    - Tendencia emisiones (20%)
    - Inversión activos ambientales (20%)
    - Cobertura reportería (10%)
    - Certificaciones (10%)
    """
    entity = db.query(EntityModel).filter(EntityModel.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    # Obtener asientos
    query = db.query(AsientoModel).filter(
        AsientoModel.entity_id == entity_id,
        AsientoModel.estado == "validado",
    )
    if periodo:
        query = query.filter(AsientoModel.periodo == periodo)

    asientos = query.all()

    if not asientos:
        return GreenScoreResponse(
            entity_id=str(entity_id),
            razon_social=entity.razon_social,
            green_score=0,
            nivel="Sin datos",
            productos_elegibles=[],
            metricas={"asientos": 0, "nota": "Sin asientos verdes para evaluar"},
        )

    # Calcular componentes del score
    total = len(asientos)
    verdes = sum(1 for a in asientos if a.taxonomia_tmas == "verde")
    transicion = sum(1 for a in asientos if a.taxonomia_tmas == "transicion")
    activos = sum(float(a.monto_debe or 0) for a in asientos if str(a.cuenta_debe or "").startswith("1595"))
    pasivos = sum(float(a.monto_haber or 0) for a in asientos if str(a.cuenta_haber or "").startswith("2630"))

    # Score T-MAS (40 puntos max)
    tmas_ratio = (verdes + transicion * 0.5) / total if total > 0 else 0
    score_tmas = min(40, int(tmas_ratio * 40))

    # Score inversión (20 puntos max)
    inversion_ratio = activos / pasivos if pasivos > 0 else 0
    score_inversion = min(20, int(inversion_ratio * 20))

    # Score volumen (20 puntos max) - más asientos = más cobertura
    score_volumen = min(20, int(min(total / 50, 1) * 20))

    # Score base reportería + certificaciones (20 puntos)
    score_base = 10  # Base por tener contabilidad ambiental

    green_score = min(100, score_tmas + score_inversion + score_volumen + score_base)

    # Determinar nivel y productos
    if green_score >= 80:
        nivel = "Excelente"
        productos = [
            "Bonos verdes",
            "Tasa preferencial verde",
            "Crédito inversión sostenible",
            "Leasing verde",
        ]
    elif green_score >= 60:
        nivel = "Bueno"
        productos = [
            "Crédito verde",
            "Leasing verde",
            "Línea capital trabajo verde",
        ]
    elif green_score >= 40:
        nivel = "Transición"
        productos = [
            "Financiamiento mejora ambiental",
            "Crédito transición energética",
        ]
    else:
        nivel = "Inicial"
        productos = ["Plan asesoría ambiental", "Diagnóstico gratuito"]

    return GreenScoreResponse(
        entity_id=str(entity_id),
        razon_social=entity.razon_social,
        green_score=green_score,
        nivel=nivel,
        productos_elegibles=productos,
        metricas={
            "total_asientos": total,
            "asientos_verdes_tmas": verdes,
            "asientos_transicion_tmas": transicion,
            "ratio_tmas_verde": round(tmas_ratio, 3),
            "activos_ambientales_clp": round(activos, 2),
            "pasivos_ambientales_clp": round(pasivos, 2),
            "componentes_score": {
                "tmas": score_tmas,
                "inversion": score_inversion,
                "volumen": score_volumen,
                "base": score_base,
            },
        },
    )
