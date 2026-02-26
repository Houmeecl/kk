"""
SII Client - Cliente para API SII Chile
"""
import httpx
import xmltodict
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class SIIClient:
    """Cliente para API SII Chile"""
    
    def __init__(self):
        self.base_url = settings.SII_API_URL
        self.timeout = settings.SII_TIMEOUT
        self.token: Optional[str] = None
        self.session = httpx.AsyncClient(timeout=self.timeout)
    
    async def autenticar(self, rut: str, password: str) -> str:
        """
        Autenticar con SII
        
        Args:
            rut: RUT de la empresa
            password: ContraseÃ±a SII (se debe desencriptar antes)
        
        Returns:
            Token JWT
        """
        url = f"{self.base_url}/boleta.electronica/auth"
        
        payload = {
            "rut": rut,
            "password": password
        }
        
        try:
            response = await self.session.post(url, json=payload)
            response.raise_for_status()
            
            data = response.json()
            self.token = data.get("token")
            
            logger.info(f"AutenticaciÃ³n SII exitosa para RUT {rut}")
            
            return self.token
            
        except httpx.HTTPError as e:
            logger.error(f"Error autenticando con SII: {e}")
            raise
    
    async def obtener_documentos_recibidos(
        self,
        tipo_dte: int,
        fecha_desde: datetime,
        fecha_hasta: datetime
    ) -> List[Dict[str, Any]]:
        """
        Obtener documentos recibidos (compras)
        
        Args:
            tipo_dte: Tipo DTE (33, 34, 52, etc)
            fecha_desde: Fecha inicio
            fecha_hasta: Fecha fin
        
        Returns:
            Lista de documentos
        """
        if not self.token:
            raise ValueError("No autenticado. Llamar autenticar() primero")
        
        url = f"{self.base_url}/boleta.electronica/v1/documentos/recibidos"
        
        params = {
            "tipo": tipo_dte,
            "fechaDesde": fecha_desde.strftime("%Y-%m-%d"),
            "fechaHasta": fecha_hasta.strftime("%Y-%m-%d")
        }
        
        headers = {
            "Authorization": f"Bearer {self.token}"
        }
        
        try:
            response = await self.session.get(url, params=params, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            documentos = data.get("documentos", [])
            
            logger.info(f"Obtenidos {len(documentos)} DTEs tipo {tipo_dte}")
            
            return documentos
            
        except httpx.HTTPError as e:
            logger.error(f"Error obteniendo documentos SII: {e}")
            raise
    
    async def descargar_xml_dte(self, tipo_dte: int, folio: int) -> str:
        """
        Descargar XML completo de un DTE
        
        Args:
            tipo_dte: Tipo DTE
            folio: NÃºmero folio
        
        Returns:
            Contenido XML como string
        """
        if not self.token:
            raise ValueError("No autenticado")
        
        url = f"{self.base_url}/boleta.electronica/v1/documentos/{folio}/xml"
        
        params = {"tipo": tipo_dte}
        
        headers = {
            "Authorization": f"Bearer {self.token}"
        }
        
        try:
            response = await self.session.get(url, params=params, headers=headers)
            response.raise_for_status()
            
            xml_content = response.text
            
            logger.debug(f"Descargado XML DTE {tipo_dte}-{folio}")
            
            return xml_content
            
        except httpx.HTTPError as e:
            logger.error(f"Error descargando XML DTE: {e}")
            raise
    
    async def cerrar(self):
        """Cerrar sesiÃ³n HTTP"""
        await self.session.aclose()
