"""
Asiento Verde (Green Entry) Model
"""
from sqlalchemy import Column, String, Integer, Numeric, Float, Boolean, DateTime, Date, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base


class AsientoVerde(Base):
    """
    Asiento contable ambiental (partida doble verde)
    """
    __tablename__ = "asientos_verdes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # RelaciÃ³n entidad
    entity_id = Column(UUID(as_uuid=True), ForeignKey("entities.id"), nullable=False, index=True)
    
    # Fecha contable
    fecha = Column(DateTime, nullable=False, index=True)
    periodo = Column(String(7), nullable=False, index=True)  # YYYY-MM
    
    # ClasificaciÃ³n
    tipo = Column(String(100), nullable=False, index=True)
    # consumo_energia, consumo_combustible, transporte, residuo, inversion_verde, etc
    
    categoria = Column(String(100), nullable=False)
    # energia, combustible, agua, transporte, residuos, inversiones
    
    subcategoria = Column(String(100))
    # electricidad, diesel, transporte_terrestre, reciclaje, etc
    
    # DescripciÃ³n
    descripcion = Column(Text, nullable=False)
    
    # Cantidades fÃ­sicas
    cantidad_fisica = Column(Float, nullable=False)
    unidad_fisica = Column(String(50), nullable=False)  # kWh, litros, km, kg, m3
    
    # Factor aplicado
    factor_id = Column(UUID(as_uuid=True), ForeignKey("factors.id"))
    factor_valor = Column(Float)
    factor_unidad = Column(String(50))
    
    # Impacto ambiental calculado
    emisiones_tco2e = Column(Float)  # Toneladas CO2 equivalente
    consumo_agua_m3 = Column(Float)
    residuos_kg = Column(Float)
    
    # Alcance GEI (si aplica)
    alcance_gei = Column(Integer)  # 1, 2, 3
    
    # Cuentas contables
    debe_cuenta = Column(String(20))  # CÃ³digo cuenta plan cuentas verde
    debe_nombre = Column(String(255))
    debe_monto = Column(Float)  # CLP
    
    haber_cuenta = Column(String(20))
    haber_nombre = Column(String(255))
    haber_monto = Column(Float)  # CLP
    
    # Evidencia vinculada
    evidencia_id = Column(UUID(as_uuid=True), ForeignKey("evidences.id"))
    
    # Metadata adicional
    metadata_json = Column(JSON, default={})
    # Ejemplo vehiculo: {marca, modelo, patente, eficiencia, etc}
    
    # TaxonomÃ­a verde
    taxonomia_clasificacion = Column(String(50))  # verde, transicion, habilitante, no_verde
    taxonomia_criterio = Column(Text)
    
    # Estado
    estado = Column(String(50), default="confirmado")  # draft, confirmado, anulado
    
    # AuditorÃ­a
    creado_por = Column(String(100))  # usuario o "sistema"
    verificado_por = Column(String(100))
    verificado_at = Column(DateTime)
    
    # Fechas
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    entity = relationship("Entity", back_populates="asientos_verdes")
    evidencia = relationship("Evidence", back_populates="asientos_verdes")
    
    def __repr__(self):
        return f"<AsientoVerde {self.fecha} - {self.tipo} - {self.emisiones_tco2e}tCO2e>"
