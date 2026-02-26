"""
SII Service - LÃ³gica sincronizaciÃ³n SII
"""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Any
from uuid import UUID
import logging

from app.models.entity import Entity
from app.models.evidence import Evidence
from app.models.asiento_verde import AsientoVerde
from app.integrations.sii_client import SIIClient
from app.services.clasificador_service import ClasificadorService
from app.services.asiento_service import AsientoService
from app.utils.xml_parser import XMLParser

logger = logging.getLogger(__name__)


class SIIService:
    """Servicio para sincronizaciÃ³n con SII Chile"""
    
    def __init__(self, db: Session):
        self.db = db
        self.sii_client = SIIClient()
        self.clasificador = ClasificadorService()
        self.asiento_service = AsientoService(db)
        self.xml_parser = XMLParser()
    
    async def sincronizar_entity(
        self,
        entity_id: UUID,
        fecha_desde: datetime,
        fecha_hasta: datetime,
        tipos_dte: List[int] = None
    ) -> Dict[str, Any]:
        """
        Sincronizar documentos SII para una entidad
        
        Args:
            entity_id: ID de la entidad
            fecha_desde: Fecha inicio sincronizaciÃ³n
            fecha_hasta: Fecha fin sincronizaciÃ³n
            tipos_dte: Tipos DTE a sincronizar (default: todos)
        
        Returns:
            Dict con estadÃ­sticas de sincronizaciÃ³n
        """
        logger.info(f"Iniciando sync SII para entity {entity_id}")
        
        # Obtener entity
        entity = self.db.query(Entity).filter(Entity.id == entity_id).first()
        if not entity:
            raise ValueError(f"Entity {entity_id} no encontrada")
        
        if not entity.sii_configurado:
            raise ValueError(f"Entity {entity_id} no tiene SII configurado")
        
        # Stats
        stats = {
            "documentos_procesados": 0,
            "asientos_generados": 0,
            "emisiones_totales_tco2e": 0.0,
            "errores": [],
            "warnings": [],
            "por_tipo_dte": {},
            "por_categoria": {}
        }
        
        try:
            # Autenticar con SII
            await self.sii_client.autenticar(
                rut=entity.sii_rut,
                password=entity.sii_password_encrypted  # Se desencripta en cliente
            )
            
            # Tipos DTE por defecto
            if not tipos_dte:
                tipos_dte = [33, 34, 52, 56, 61]  # Facturas, GuÃ­as, Notas
            
            # Procesar por tipo DTE
            for tipo_dte in tipos_dte:
                logger.info(f"Procesando DTE tipo {tipo_dte}")
                
                # Obtener documentos recibidos
                documentos = await self.sii_client.obtener_documentos_recibidos(
                    tipo_dte=tipo_dte,
                    fecha_desde=fecha_desde,
                    fecha_hasta=fecha_hasta
                )
                
                stats["por_tipo_dte"][tipo_dte] = len(documentos)
                
                # Procesar cada documento
                for doc in documentos:
                    try:
                        await self._procesar_documento(entity, doc, stats)
                        stats["documentos_procesados"] += 1
                        
                    except Exception as e:
                        logger.error(f"Error procesando DTE {doc.get('folio')}: {e}")
                        stats["errores"].append({
                            "tipo_dte": tipo_dte,
                            "folio": doc.get("folio"),
                            "error": str(e)
                        })
            
            # Actualizar Ãºltima sync
            entity.ultima_sync_sii = datetime.utcnow()
            self.db.commit()
            
            logger.info(f"Sync completada: {stats['documentos_procesados']} docs, "
                       f"{stats['asientos_generados']} asientos")
            
            return stats
            
        except Exception as e:
            logger.error(f"Error en sync SII: {e}", exc_info=True)
            stats["errores"].append({"tipo": "general", "error": str(e)})
            raise
    
    async def _procesar_documento(
        self,
        entity: Entity,
        doc_info: Dict[str, Any],
        stats: Dict[str, Any]
    ) -> None:
        """
        Procesar un documento DTE individual
        
        Args:
            entity: Entidad
            doc_info: Info bÃ¡sica del documento
            stats: Dict de estadÃ­sticas (se modifica in-place)
        """
        tipo_dte = doc_info["tipo"]
        folio = doc_info["folio"]
        
        # Verificar si ya existe
        existing = self.db.query(Evidence).filter(
            Evidence.entity_id == entity.id,
            Evidence.source == "SII",
            Evidence.source_id == f"{tipo_dte}-{folio}"
        ).first()
        
        if existing:
            logger.debug(f"DTE {tipo_dte}-{folio} ya procesado, skip")
            return
        
        # Descargar XML completo
        xml_content = await self.sii_client.descargar_xml_dte(tipo_dte, folio)
        
        # Parsear XML
        dte_parsed = self.xml_parser.parse_dte(xml_content)
        
        # Crear evidencia
        evidencia = Evidence(
            entity_id=entity.id,
            tipo=f"factura_sii_tipo_{tipo_dte}",
            source="SII",
            source_id=f"{tipo_dte}-{folio}",
            fecha=dte_parsed["fecha"],
            descripcion=f"DTE tipo {tipo_dte} folio {folio}",
            archivo_hash=self.xml_parser.calculate_hash(xml_content),
            metadata=dte_parsed
        )
        
        self.db.add(evidencia)
        self.db.flush()  # Para obtener evidencia.id
        
        # Clasificar items ambientalmente relevantes
        items_ambientales = self.clasificador.clasificar_items_dte(dte_parsed)
        
        if not items_ambientales:
            logger.debug(f"DTE {tipo_dte}-{folio} sin items ambientales")
            return
        
        # Generar asientos verdes
        for item_amb in items_ambientales:
            try:
                asiento = await self.asiento_service.generar_asiento_desde_item(
                    entity_id=entity.id,
                    evidencia_id=evidencia.id,
                    item_data=item_amb,
                    fecha_transaccion=dte_parsed["fecha"]
                )
                
                stats["asientos_generados"] += 1
                
                if asiento.emisiones_tco2e:
                    stats["emisiones_totales_tco2e"] += asiento.emisiones_tco2e
                
                # Contar por categorÃ­a
                cat = asiento.categoria
                stats["por_categoria"][cat] = stats["por_categoria"].get(cat, 0) + 1
                
            except Exception as e:
                logger.error(f"Error generando asiento para item: {e}")
                stats["warnings"].append({
                    "dte": f"{tipo_dte}-{folio}",
                    "item": item_amb.get("nombre"),
                    "error": str(e)
                })
        
        # Commit evidencia + asientos
        self.db.commit()
