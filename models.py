# app/models.py
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
import enum

from app.database import Base


class AlcanceGEI(str, enum.Enum):
    """Alcance emisiones GEI"""
    ALCANCE_1 = "alcance_1"
    ALCANCE_2 = "alcance_2"
    ALCANCE_3 = "alcance_3"


class EstadoEvento(str, enum.Enum):
    """Estado evento"""
    PLANIFICACION = "planificacion"
    EN_CURSO = "en_curso"
    FINALIZADO = "finalizado"
    CERTIFICADO = "certificado"


# ==========================================
# USUARIOS Y AUTENTICACIÓN
# ==========================================

class User(Base):
    """Usuario del sistema"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    entities = relationship("Entity", back_populates="owner")


# ==========================================
# ENTIDADES (EMPRESAS)
# ==========================================

class Entity(Base):
    """Entidad/Empresa"""
    __tablename__ = "entities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rut = Column(String(20), unique=True, index=True, nullable=False)
    razon_social = Column(String(255), nullable=False)
    nombre_fantasia = Column(String(255))
    sector = Column(String(100))
    actividad_principal = Column(Text)
    
    # Contacto
    direccion = Column(String(500))
    comuna = Column(String(100))
    region = Column(String(100))
    telefono = Column(String(50))
    email = Column(String(255))
    website = Column(String(255))
    
    # Financiero
    facturacion_anual_clp = Column(Float)
    num_empleados = Column(Integer)
    
    # Logo
    logo_url = Column(String(500))
    
    # Owner
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = relationship("User", back_populates="entities")
    asientos = relationship("AsientoVerde", back_populates="entity")
    eventos = relationship("Evento", back_populates="entity")


# ==========================================
# ASIENTOS VERDES (CONTABILIDAD AMBIENTAL)
# ==========================================

class AsientoVerde(Base):
    """Asiento contable ambiental"""
    __tablename__ = "asientos_verdes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_id = Column(UUID(as_uuid=True), ForeignKey("entities.id"), nullable=False)
    
    # Fecha y período
    fecha = Column(DateTime, nullable=False, index=True)
    periodo = Column(String(20), index=True)  # "2026-01", "2026-Q1", "2026"
    
    # Clasificación
    categoria = Column(String(100), nullable=False, index=True)  # electricidad, combustible, agua, residuos
    subcategoria = Column(String(100), index=True)  # diesel, gasolina, plastico, etc
    alcance_gei = Column(Enum(AlcanceGEI))
    
    # Descripción
    descripcion = Column(Text, nullable=False)
    
    # Cantidades físicas
    cantidad_fisica = Column(Float, nullable=False)
    unidad = Column(String(50), nullable=False)  # kWh, litros, m3, kg, etc
    
    # Monetario
    monto_monetario_clp = Column(Float)
    
    # Emisiones
    emisiones_tco2e = Column(Float)
    factor_emision = Column(Float)
    factor_emision_unidad = Column(String(50))
    factor_emision_fuente = Column(String(255))
    
    # Evidencia y trazabilidad
    evidencia_id = Column(String(255), index=True)  # "DTE-123456", "METER-001-2026-01"
    evidencia_tipo = Column(String(100))  # factura_electronica, lectura_medidor, certificado
    evidencia_url = Column(String(500))
    evidencia_data = Column(JSONB)
    
    # Origen dato
    fuente_datos = Column(String(100))  # SII, smart_meter, manual, ERP
    automatico = Column(Boolean, default=False)
    validado = Column(Boolean, default=False)
    
    # Calidad
    score_calidad = Column(Float)  # 0-100
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    entity = relationship("Entity", back_populates="asientos")


# ==========================================
# FACTORES DE EMISIÓN (CATÁLOGO VERSIONADO)
# ==========================================

class FactorEmision(Base):
    """Factor de emisión versionado"""
    __tablename__ = "factores_emision"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Identificador
    key = Column(String(255), nullable=False, index=True)  # "electricidad_chile_2026"
    
    # Clasificación
    categoria = Column(String(100), nullable=False)
    subcategoria = Column(String(100))
    
    # Factor
    valor = Column(Float, nullable=False)
    unidad_entrada = Column(String(50), nullable=False)  # kWh, litros, kg
    unidad_salida = Column(String(50), nullable=False)  # kgCO2e
    
    # Fuente
    fuente = Column(String(255), nullable=False)  # "Ministerio Medio Ambiente Chile"
    url_fuente = Column(String(500))
    
    # Vigencia
    vigencia_inicio = Column(DateTime, nullable=False)
    vigencia_fin = Column(DateTime)
    
    # Versión
    version = Column(String(50), nullable=False)  # "v2026.1"
    
    # Metadata
    metadata_extra = Column(JSONB)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)


# ==========================================
# EVENTOS (FESTIVALES, CONFERENCIAS)
# ==========================================

class Evento(Base):
    """Evento temporal (festival, conferencia, etc)"""
    __tablename__ = "eventos"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_id = Column(UUID(as_uuid=True), ForeignKey("entities.id"))
    
    # Información básica
    nombre = Column(String(255), nullable=False)
    tipo = Column(String(100))  # festival, concierto, conferencia, deportivo
    slug = Column(String(255), unique=True, index=True)
    
    # Fechas
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=False)
    dias_duracion = Column(Integer)
    
    # Ubicación
    ubicacion_nombre = Column(String(255))
    ubicacion_lat = Column(Float)
    ubicacion_lng = Column(Float)
    
    # Asistencia
    asistentes_estimados = Column(Integer)
    asistentes_reales = Column(Integer)
    
    # Contacto
    organizador_nombre = Column(String(255))
    organizador_email = Column(String(255))
    organizador_telefono = Column(String(50))
    
    # Estado
    estado = Column(Enum(EstadoEvento), default=EstadoEvento.PLANIFICACION)
    
    # Métricas ambientales
    huella_total_tco2e = Column(Float)
    residuos_total_kg = Column(Float)
    score_verde = Column(Integer)  # 0-100
    
    # Certificaciones
    certificado_verde = Column(Boolean, default=False)
    carbono_neutral = Column(Boolean, default=False)
    bonos_carbono_compensados_tco2e = Column(Float)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    entity = relationship("Entity", back_populates="eventos")
    transporte = relationship("EventoTransporte", back_populates="evento")
    energia = relationship("EventoEnergia", back_populates="evento")
    residuos = relationship("EventoResiduos", back_populates="evento")


class EventoTransporte(Base):
    """Transporte asistentes evento"""
    __tablename__ = "evento_transporte"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evento_id = Column(UUID(as_uuid=True), ForeignKey("eventos.id"), nullable=False)
    
    tipo_transporte = Column(String(50), nullable=False)  # auto, bus, metro, vuelo, etc
    num_asistentes = Column(Integer)
    distancia_promedio_km = Column(Float)
    ocupacion_promedio = Column(Float)
    tipo_combustible = Column(String(50))
    
    emisiones_tco2e = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    evento = relationship("Evento", back_populates="transporte")


class EventoEnergia(Base):
    """Energía consumida evento"""
    __tablename__ = "evento_energia"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evento_id = Column(UUID(as_uuid=True), ForeignKey("eventos.id"), nullable=False)
    
    fuente = Column(String(50), nullable=False)  # red_electrica, generador_diesel, solar
    categoria = Column(String(100))  # escenario, iluminacion, refrigeracion
    
    consumo_kwh = Column(Float)
    consumo_combustible_litros = Column(Float)
    horas_uso = Column(Float)
    potencia_promedio_kw = Column(Float)
    
    emisiones_tco2e = Column(Float)
    evidencia_id = Column(String(255))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    evento = relationship("Evento", back_populates="energia")


class EventoResiduos(Base):
    """Residuos generados evento"""
    __tablename__ = "evento_residuos"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evento_id = Column(UUID(as_uuid=True), ForeignKey("eventos.id"), nullable=False)
    
    tipo_residuo = Column(String(50), nullable=False)  # organico, plastico, papel, vidrio
    peso_kg = Column(Float, nullable=False)
    destino = Column(String(50), nullable=False)  # reciclaje, compostaje, vertedero
    
    punto_recoleccion = Column(String(100))
    fecha_recoleccion = Column(DateTime)
    
    tasa_reciclaje = Column(Float)
    emisiones_tco2e = Column(Float)
    emisiones_evitadas_tco2e = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    evento = relationship("Evento", back_populates="residuos")


# ==========================================
# REPORTES ESG
# ==========================================

class ReporteESG(Base):
    """Reporte ESG generado"""
    __tablename__ = "reportes_esg"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_id = Column(UUID(as_uuid=True), ForeignKey("entities.id"), nullable=False)
    
    # Período
    periodo = Column(String(20), nullable=False)  # "2026", "2026-Q1"
    
    # Estándares
    estandares = Column(JSONB)  # ["GRI", "TCFD", "NCG519"]
    
    # Contenido reporte
    contenido = Column(JSONB)
    
    # Archivos generados
    pdf_url = Column(String(500))
    excel_url = Column(String(500))
    
    # Timestamps
    fecha_generacion = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
