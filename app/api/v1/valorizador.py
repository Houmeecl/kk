"""
KONTAX - Valorizador Endpoints: Extraer y valorizar reportes ESG/Huella en PDF y analizar boletín tributario.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import json
import logging

try:
    import PyPDF2
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False

from app.services.openclaw_client import run_openclaw

router = APIRouter()
logger = logging.getLogger(__name__)


def extract_text_from_pdf(file: UploadFile) -> str:
    if not HAS_PYPDF:
        return f"Mocked PDF text extraction. (Requires PyPDF2). Document: {file.filename}."
    
    try:
        reader = PyPDF2.PdfReader(file.file)
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "
"
        return text
    except Exception as e:
        logger.error(f"Error reading PDF: {e}")
        raise HTTPException(status_code=400, detail="Error leyendo el documento PDF.")


class ValorizadorResponse(BaseModel):
    message: str
    valorizacion_clp: float
    alcance1_tco2e: float
    alcance2_tco2e: float
    alcance3_tco2e: float
    ai_insights: str


@router.post("/esg", response_model=ValorizadorResponse)
async def upload_esg_pdf(
    file: UploadFile = File(...),
):
    """
    Sube un reporte ESG o de Huella de Carbono en formato PDF.
    El sistema extrae el texto, usa Inteligencia Artificial (OpenClaw)
    para identificar los alcances (Scopes) 1, 2 y 3, y los valoriza
    financieramente simulando asientos contables (Capital Natural MMA).
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF.")
        
    extracted_text = extract_text_from_pdf(file)
    
    # Prompting the local AI agent to structure the extraction
    prompt = f"""
    Eres el Agente Analítico de KONTAX. 
    Analiza este extracto de reporte ESG/Huella de Carbono y extrae las emisiones de Alcance 1, 2 y 3 en toneladas de CO2 equivalente (tCO2e).
    Luego valoriza estas emisiones al precio social del carbono (aprox $4.500 CLP por tonelada).
    
    Responde en formato JSON estricto:
    {{
        "alcance1": float,
        "alcance2": float,
        "alcance3": float,
        "valorizacion_total_clp": float,
        "insights": "breve resumen y recomendaciones para contabilidad verde"
    }}

    Texto a analizar:
    {extracted_text[:2000]} # Limitado para no desbordar contexto
    """
    
    ai_response = run_openclaw(prompt)
    
    # Intento de parsear JSON, si falla uso valores por defecto y el string devuelto
    try:
        data = json.loads(ai_response)
        a1 = data.get("alcance1", 0.0)
        a2 = data.get("alcance2", 0.0)
        a3 = data.get("alcance3", 0.0)
        val = data.get("valorizacion_total_clp", 0.0)
        insights = data.get("insights", "")
    except Exception:
        # Fallback if AI doesn't return pure JSON
        a1 = a2 = a3 = 0.0
        val = 0.0
        insights = ai_response

    return ValorizadorResponse(
        message="PDF procesado y valorizado con éxito.",
        alcance1_tco2e=a1,
        alcance2_tco2e=a2,
        alcance3_tco2e=a3,
        valorizacion_clp=val,
        ai_insights=insights,
    )


class BoletinResponse(BaseModel):
    message: str
    riesgo: str
    ai_insights: str


@router.post("/boletin", response_model=BoletinResponse)
async def analyze_boletin_tributario(
    file: UploadFile = File(...),
):
    """
    Servicio para subir y analizar un Boletín Tributario (PDF).
    Extrae multas, observaciones en F29/F22, deudas TGR y evalúa el riesgo
    financiero/tributario de la PYME de cara a créditos o reportes.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF.")
        
    extracted_text = extract_text_from_pdf(file)
    
    prompt = f"""
    Analiza este Boletín Tributario y devuelve una clasificación de riesgo (Alto, Medio, Bajo).
    Resume multas, morosidades o problemas con el SII (F29, F22) y entrega insights contables.
    
    Responde en formato JSON estricto:
    {{
        "riesgo": "Alto|Medio|Bajo",
        "insights": "resumen del boletín"
    }}

    Texto a analizar:
    {extracted_text[:2000]}
    """
    
    ai_response = run_openclaw(prompt)
    
    try:
        data = json.loads(ai_response)
        riesgo = data.get("riesgo", "Desconocido")
        insights = data.get("insights", "")
    except Exception:
        riesgo = "Análisis pendiente"
        insights = ai_response

    return BoletinResponse(
        message="Boletín analizado con éxito.",
        riesgo=riesgo,
        ai_insights=insights,
    )
