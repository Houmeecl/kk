"""
Evidence (Evidencia) Model
"""
from sqlalchemy import Column, String, Integer, Numeric, Float, Boolean, DateTime, Date, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base


class Evidence(Base):
    """
    Evidencia documental que respalda asientos verdes
    """
    __tablename__ = "evidences"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # RelaciÃ³n con entidad
    entity_id = Column(UUID(as_uuid=True), ForeignKey("entities.id"), nullable=False, index=True)
    
    # Tipo evidencia
    tipo = Column(String(100), nullable=False, index=True)
    # Tipos: factura_sii, guia_despacho, contrato, medicion, informe_lab, acta, foto
    
    # Fuente
    source = Column(String(100), nullable=False)  # SII, Manual, ERP, Sensor, etc
    source_id = Column(String(255))  # ID en fuente (ej: folio DTE)
    
    # Datos
    fecha = Column(DateTime, nullable=False, index=True)
    descripcion = Column(Text)
    
    # Archivo
    archivo_url = Column(String(500))  # URL en MinIO
    archivo_nombre = Column(String(255))
    archivo_tipo = Column(String(50))  # PDF, XML, JPG, etc
    archivo_hash = Column(String(64))  # SHA-256
    
    # Metadata
    metadata_json = Column(JSON, default={})
    # Ejemplo: {"dte_tipo": 33, "folio": 123456, "monto": 1200000, ...}
    
    # Blockchain (opcional)
    blockchain_hash = Column(String(64))
    blockchain_timestamp = Column(DateTime)
    
    # Estado
    estado = Column(String(50), default="activo")  # activo, anulado
    
    # Fechas
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    entity = relationship("Entity", back_populates="evidencias")
    asientos_verdes = relationship("AsientoVerde", back_populates="evidencia")
    
    def __repr__(self):
        return f"<Evidence {self.id} - {self.tipo}>"
