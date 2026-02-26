"""
KONTAX - Evidencias Endpoints: Upload, List, Verify
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import hashlib

from app.core.database import get_db
from app.models.evidence import Evidence as EvidenceModel
from app.api.deps import get_current_user, require_contador
from pydantic import BaseModel
from datetime import datetime


class EvidenceResponse(BaseModel):
    id: UUID
    entity_id: UUID
    tipo: str
    numero_documento: Optional[str] = None
    fuente: str
    hash_sha256: str
    fecha_documento: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EvidenceCreate(BaseModel):
    entity_id: UUID
    tipo: str
    numero_documento: Optional[str] = None
    fuente: str = "manual"
    xml_contenido: Optional[str] = None
    metadata_json: Optional[dict] = None


router = APIRouter()


@router.get("/", response_model=List[EvidenceResponse])
async def list_evidencias(
    entity_id: Optional[UUID] = None,
    tipo: Optional[str] = None,
    fuente: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Listar evidencias documentales.

    Tipos: factura, guia_despacho, certificado, medicion, nota_credito
    Fuentes: sii_api, manual, sensor, boostr, erp
    """
    query = db.query(EvidenceModel)

    if entity_id:
        query = query.filter(EvidenceModel.entity_id == entity_id)
    if tipo:
        query = query.filter(EvidenceModel.tipo == tipo)
    if fuente:
        query = query.filter(EvidenceModel.fuente == fuente)

    return query.order_by(EvidenceModel.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{evidence_id}", response_model=EvidenceResponse)
async def get_evidencia(
    evidence_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Obtener evidencia por ID"""
    evidence = db.query(EvidenceModel).filter(EvidenceModel.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidencia no encontrada")
    return evidence


@router.post("/", response_model=EvidenceResponse, status_code=201)
async def create_evidencia(
    data: EvidenceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_contador),
):
    """Crear evidencia manualmente"""
    # Generar hash del contenido
    content = (data.xml_contenido or str(data.metadata_json_json or "")).encode("utf-8")
    hash_sha256 = hashlib.sha256(content).hexdigest()

    # Verificar duplicado
    existing = (
        db.query(EvidenceModel)
        .filter(EvidenceModel.hash_sha256 == hash_sha256)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Evidencia duplicada (hash: {hash_sha256[:16]}...)",
        )

    evidence = EvidenceModel(
        entity_id=data.entity_id,
        tipo=data.tipo,
        numero_documento=data.numero_documento,
        fuente=data.fuente,
        hash_sha256=hash_sha256,
        xml_contenido=data.xml_contenido,
        metadata_json=data.metadata_json_json or {},
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return evidence


@router.get("/verify/{hash_sha256}")
async def verify_evidencia(
    hash_sha256: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Verificar integridad de evidencia por hash SHA-256.
    Retorna si existe y su estado.
    """
    evidence = (
        db.query(EvidenceModel)
        .filter(EvidenceModel.hash_sha256 == hash_sha256)
        .first()
    )

    if evidence:
        return {
            "verificado": True,
            "hash": hash_sha256,
            "evidence_id": str(evidence.id),
            "tipo": evidence.tipo,
            "fecha": str(evidence.created_at),
        }
    else:
        return {
            "verificado": False,
            "hash": hash_sha256,
            "message": "No se encontró evidencia con este hash",
        }
