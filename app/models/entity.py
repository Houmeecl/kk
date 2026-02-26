"""
Entity (Empresa) Model
"""
from sqlalchemy import Column, String, Integer, Numeric, Float, Boolean, DateTime, Date, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base


class Entity(Base):
    """
    Entidad (Empresa) que usa KONTAX
    """
    __tablename__ = "entities"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # IdentificaciÃ³n
    rut = Column(String(12), unique=True, nullable=False, index=True)
    razon_social = Column(String(255), nullable=False)
    nombre_fantasia = Column(String(255))
    giro = Column(String(500))
    
    # UbicaciÃ³n
    direccion = Column(String(500))
    comuna = Column(String(100))
    region = Column(String(100))
    pais = Column(String(2), default="CL")
    
    # ClasificaciÃ³n
    sector = Column(String(100))  # manufactura, mineria, inmobiliaria, etc
    tamanio = Column(String(50))  # pyme, mediana, grande
    num_empleados = Column(Integer)
    ventas_anuales = Column(Integer)  # En CLP
    
    # Plan KONTAX
    plan = Column(String(50))  # empresas, inmobiliarias, mineria, etc
    estado = Column(String(50), default="activo")  # activo, suspendido, cancelado
    
    # ConfiguraciÃ³n SII
    sii_configurado = Column(Boolean, default=False)
    sii_rut = Column(String(12))
    sii_password_encrypted = Column(String(500))  # Encrypted
    ultima_sync_sii = Column(DateTime)
    
    # Metadata
    metadata_json = Column(JSON, default={})
    
    # Fechas
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    evidencias = relationship("Evidence", back_populates="entity", cascade="all, delete-orphan")
    asientos_verdes = relationship("AsientoVerde", back_populates="entity", cascade="all, delete-orphan")
    reportes = relationship("Reporte", back_populates="entity", cascade="all, delete-orphan")
    usuarios = relationship("User", back_populates="entity")
    
    def __repr__(self):
        return f"<Entity {self.rut} - {self.razon_social}>"
