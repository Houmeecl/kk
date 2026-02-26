from fastapi import APIRouter
from pydantic import BaseModel
from app.services.openclaw_client import run_openclaw

router = APIRouter()


class LibroVerdeInput(BaseModel):
    empresa: str
    diesel: float = 0
    electricidad: float = 0
    agua: float = 0


@router.post("/libro-verde")
def generar_libro_verde(data: LibroVerdeInput):
    prompt = f"""
    Genera un Libro Verde para la empresa {data.empresa}
    con los siguientes datos:

    Diesel: {data.diesel} litros
    Electricidad: {data.electricidad} kWh
    Agua: {data.agua} m3

    Incluye:
    - Huella de carbono
    - Capital natural
    - Balance SEEA
    - Clasificación Taxonomía T-MAS
    - Indicadores ESG y ODS
    - Recomendaciones
    """

    resultado = run_openclaw(prompt)
    return {"resultado": resultado}
