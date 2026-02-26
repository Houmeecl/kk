"""
Boostr Client - Cliente para API Boostr
"""
import httpx
from typing import Dict, Any, Optional
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class BoostrClient:
    """Cliente para API Boostr (vehÃ­culos)"""
    
    def __init__(self):
        self.base_url = settings.BOOSTR_API_URL
        self.api_key = settings.BOOSTR_API_KEY
        self.timeout = 30
        self.session = httpx.AsyncClient(
            timeout=self.timeout,
            headers={"X-API-Key": self.api_key}
        )
    
    async def obtener_info_vehiculo_por_patente(
        self,
        patente: str
    ) -> Dict[str, Any]:
        """
        Obtener informaciÃ³n completa de vehÃ­culo por patente
        
        Args:
            patente: Patente del vehÃ­culo (ej: "ABCD12")
        
        Returns:
            Dict con info vehÃ­culo
        """
        url = f"{self.base_url}/car/plate/{patente}"
        
        try:
            response = await self.session.get(url)
            response.raise_for_status()
            
            data = response.json()
            
            logger.info(f"Info vehÃ­culo obtenida para patente {patente}")
            
            return data
            
        except httpx.HTTPError as e:
            logger.error(f"Error obteniendo info vehÃ­culo: {e}")
            raise
    
    async def obtener_eficiencia_combustible(
        self,
        patente: str
    ) -> Dict[str, Any]:
        """
        Obtener eficiencia combustible de vehÃ­culo
        
        Args:
            patente: Patente
        
        Returns:
            Dict con eficiencia y emisiones
        """
        url = f"{self.base_url}/car/fuel_efficiency"
        
        params = {"plate": patente}
        
        try:
            response = await self.session.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            # Estructura respuesta:
            # {
            #   "brand": "Toyota",
            #   "model": "Hilux",
            #   "year": 2022,
            #   "fuel_type": "Diesel",
            #   "fuel_efficiency": {
            #     "city_km_per_liter": 11.0,
            #     "highway_km_per_liter": 13.5,
            #     "combined_km_per_liter": 12.0
            #   },
            #   "co2_emissions_g_per_km": 195
            # }
            
            return data
            
        except httpx.HTTPError as e:
            logger.error(f"Error obteniendo eficiencia: {e}")
            raise
    
    async def calcular_emisiones_viaje(
        self,
        patente: str,
        distancia_km: float
    ) -> Dict[str, Any]:
        """
        Calcular emisiones de un viaje
        
        Args:
            patente: Patente del vehÃ­culo
            distancia_km: Distancia recorrida
        
        Returns:
            Dict con cÃ¡lculo de emisiones
        """
        # Obtener eficiencia
        info_vehiculo = await self.obtener_eficiencia_combustible(patente)
        
        eficiencia_combinada = info_vehiculo["fuel_efficiency"]["combined_km_per_liter"]
        co2_g_per_km = info_vehiculo["co2_emissions_g_per_km"]
        
        # Calcular consumo
        consumo_litros = distancia_km / eficiencia_combinada
        
        # Calcular emisiones (mÃ©todo 1: Boostr certificado)
        emisiones_co2_kg_boostr = (co2_g_per_km * distancia_km) / 1000
        
        # Calcular emisiones (mÃ©todo 2: Factor MMA Chile)
        # Diesel B5 = 2.68 kgCO2e/litro
        factor_diesel = 2.68
        emisiones_co2_kg_mma = consumo_litros * factor_diesel
        
        # Promedio ambos mÃ©todos
        emisiones_co2_kg = (emisiones_co2_kg_boostr + emisiones_co2_kg_mma) / 2
        
        return {
            "vehiculo": {
                "patente": patente,
                "marca": info_vehiculo.get("brand"),
                "modelo": info_vehiculo.get("model"),
                "aÃ±o": info_vehiculo.get("year"),
                "tipo_combustible": info_vehiculo.get("fuel_type")
            },
            "viaje": {
                "distancia_km": distancia_km,
                "consumo_litros": round(consumo_litros, 2),
                "eficiencia_km_lt": eficiencia_combinada
            },
            "emisiones": {
                "co2_kg": round(emisiones_co2_kg, 3),
                "co2_ton": round(emisiones_co2_kg / 1000, 4),
                "metodo_boostr_kg": round(emisiones_co2_kg_boostr, 3),
                "metodo_mma_kg": round(emisiones_co2_kg_mma, 3)
            }
        }
    
    async def cerrar(self):
        """Cerrar sesiÃ³n HTTP"""
        await self.session.aclose()
