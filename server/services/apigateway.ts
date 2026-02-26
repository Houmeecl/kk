const BASE_URL = "https://legacy.apigateway.cl";

function getApiToken(): string {
  const token = process.env.APIGATEWAY_TOKEN;
  if (!token) throw new Error("APIGATEWAY_TOKEN no configurado");
  return token;
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getApiToken()}`,
  };
}

export interface SituacionTributaria {
  rut: number;
  dv: string;
  razon_social: string;
  inicio_actividades: boolean;
  fecha_inicio_actividades: string;
  pro_pyme: boolean;
  moneda_extranjera: boolean;
  obligacion_dte: boolean;
  excepcion_dte: boolean;
  actividades: {
    codigo: string;
    glosa: string;
    afecta: boolean;
    categoria: number;
  }[];
  documentos_timbrados: {
    documento: string;
    ultimo_timbraje: number;
  }[];
  observaciones: {
    inconcurrente: boolean;
    suplantado: boolean;
    no_ubicado: boolean;
    termino_giro: boolean;
    domicilio_inexistente: boolean;
    actividad_esporadica: boolean;
    no_habido_domicilio: boolean;
    termino_giro_obligatorio: boolean;
  };
}

export interface RcvResumen {
  periodo: string;
  total_documentos?: number;
  resumen?: {
    dcv_codigo: string;
    dcv_operacion: string;
    dcv_tipo: number;
    dcv_tipo_descripcion?: string;
    cantidad: number;
    monto_neto: number;
    monto_exento: number;
    monto_iva: number;
    monto_total: number;
  }[];
}

export interface RcvDetalle {
  datos: {
    dcv_folio: number;
    dcv_tipo: number;
    dcv_rut: string;
    dcv_razon_social: string;
    dcv_fecha_emision: string;
    dcv_fecha_recepcion: string;
    dcv_monto_neto: number;
    dcv_monto_exento: number;
    dcv_monto_iva: number;
    dcv_monto_total: number;
    dcv_tipo_transaccion?: string;
  }[];
}

export interface DatosContribuyente {
  rut: number;
  dv: string;
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  comuna?: string;
  actividades?: {
    codigo: string;
    glosa: string;
  }[];
}

async function apiRequest(method: string, path: string, body?: any): Promise<any> {
  const url = `${BASE_URL}${path}`;
  const opts: RequestInit = {
    method,
    headers: headers(),
  };
  if (body) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API Gateway error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getSituacionTributaria(rut: string): Promise<SituacionTributaria> {
  return apiRequest("GET", `/api/v1/sii/contribuyentes/situacion_tributaria/tercero/${rut}?formato=json`);
}

export async function getActividadesEconomicas(): Promise<any[]> {
  return apiRequest("GET", `/api/v1/sii/contribuyentes/actividades_economicas`);
}

export async function getUf(anio: number, mes: number, dia: number): Promise<any> {
  return apiRequest("GET", `/api/v1/sii/indicadores/uf/anual/${anio}/${mes}/${dia}`);
}

export async function getDatosContribuyente(rut: string, clave: string): Promise<DatosContribuyente> {
  return apiRequest("POST", `/api/v1/sii/misii/contribuyente/datos`, {
    auth: { pass: { rut, clave } },
  });
}

export async function getRepresentados(rut: string, clave: string): Promise<any> {
  return apiRequest("POST", `/api/v1/sii/misii/representados/listado`, {
    auth: { pass: { rut, clave } },
  });
}

export async function getRcvComprasResumen(
  receptor: string,
  periodo: string,
  estado: string,
  rut: string,
  clave: string
): Promise<RcvResumen> {
  return apiRequest("POST", `/api/v1/sii/rcv/compras/resumen/${receptor}/${periodo}/${estado}`, {
    auth: { pass: { rut, clave } },
  });
}

export async function getRcvComprasDetalle(
  receptor: string,
  periodo: string,
  dte: string,
  estado: string,
  rut: string,
  clave: string
): Promise<RcvDetalle> {
  return apiRequest("POST", `/api/v1/sii/rcv/compras/detalle/${receptor}/${periodo}/${dte}/${estado}`, {
    auth: { pass: { rut, clave } },
  });
}

export async function getRcvVentasResumen(
  emisor: string,
  periodo: string,
  rut: string,
  clave: string
): Promise<RcvResumen> {
  return apiRequest("POST", `/api/v1/sii/rcv/ventas/resumen/${emisor}/${periodo}`, {
    auth: { pass: { rut, clave } },
  });
}

export async function getRcvVentasDetalle(
  emisor: string,
  periodo: string,
  dte: string,
  rut: string,
  clave: string
): Promise<RcvDetalle> {
  return apiRequest("POST", `/api/v1/sii/rcv/ventas/detalle/${emisor}/${periodo}/${dte}`, {
    auth: { pass: { rut, clave } },
  });
}

export async function getBheEmitidas(
  emisor: string,
  periodo: string,
  rut: string,
  clave: string
): Promise<any> {
  return apiRequest("POST", `/api/v1/sii/bhe/emitidas/documentos/${emisor}/${periodo}`, {
    auth: { pass: { rut, clave } },
  });
}

export async function getEstadoAutorizacion(rut: string): Promise<any> {
  return apiRequest("GET", `/api/v1/sii/dte/contribuyentes/autorizado/${rut}`);
}

export async function verificarDte(data: {
  emisor: string;
  receptor: string;
  dte: number;
  folio: number;
  fecha: string;
  total: number;
  rut: string;
  clave: string;
}): Promise<any> {
  return apiRequest("POST", `/api/v1/sii/dte/emitidos/verificar`, {
    auth: { pass: { rut: data.rut, clave: data.clave } },
    emisor: data.emisor,
    receptor: data.receptor,
    dte: data.dte,
    folio: data.folio,
    fecha: data.fecha,
    total: data.total,
  });
}

export const DTE_TYPES: Record<number, string> = {
  33: "Factura Electrónica",
  34: "Factura No Afecta o Exenta Electrónica",
  39: "Boleta Electrónica",
  41: "Boleta Exenta Electrónica",
  46: "Factura de Compra Electrónica",
  52: "Guía de Despacho Electrónica",
  56: "Nota de Débito Electrónica",
  61: "Nota de Crédito Electrónica",
  110: "Factura de Exportación Electrónica",
  112: "Nota de Débito de Exportación Electrónica",
  111: "Nota de Crédito de Exportación Electrónica",
};

export interface ExtraccionCompleta {
  situacionTributaria: SituacionTributaria | null;
  rcvComprasResumen: RcvResumen | null;
  rcvVentasResumen: RcvResumen | null;
  rcvComprasDetalle: RcvDetalle["datos"];
  rcvVentasDetalle: RcvDetalle["datos"];
}

export async function extraerDatosCompletos(
  empresaRut: string,
  siiRut: string,
  siiClave: string,
  periodo?: string
): Promise<ExtraccionCompleta> {
  const result: ExtraccionCompleta = {
    situacionTributaria: null,
    rcvComprasResumen: null,
    rcvVentasResumen: null,
    rcvComprasDetalle: [],
    rcvVentasDetalle: [],
  };

  const now = new Date();
  const per = periodo || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const perAnterior = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

  try {
    result.situacionTributaria = await getSituacionTributaria(empresaRut);
  } catch (err: any) {
    console.warn("extraerDatos: situación tributaria:", err.message);
  }

  try {
    result.rcvComprasResumen = await getRcvComprasResumen(empresaRut, per, "REGISTRO", siiRut, siiClave);
  } catch (err: any) {
    console.warn("extraerDatos: RCV compras resumen período actual:", err.message);
    try {
      result.rcvComprasResumen = await getRcvComprasResumen(empresaRut, perAnterior, "REGISTRO", siiRut, siiClave);
    } catch (err2: any) {
      console.warn("extraerDatos: RCV compras resumen período anterior:", err2.message);
    }
  }

  try {
    result.rcvVentasResumen = await getRcvVentasResumen(empresaRut, per, siiRut, siiClave);
  } catch (err: any) {
    console.warn("extraerDatos: RCV ventas resumen período actual:", err.message);
    try {
      result.rcvVentasResumen = await getRcvVentasResumen(empresaRut, perAnterior, siiRut, siiClave);
    } catch (err2: any) {
      console.warn("extraerDatos: RCV ventas resumen período anterior:", err2.message);
    }
  }

  const periodoCompras = result.rcvComprasResumen?.periodo || per;
  if (result.rcvComprasResumen?.resumen) {
    for (const item of result.rcvComprasResumen.resumen) {
      if (item.cantidad > 0) {
        try {
          const detalle = await getRcvComprasDetalle(
            empresaRut, periodoCompras, String(item.dcv_tipo), "REGISTRO", siiRut, siiClave
          );
          if (detalle?.datos) {
            result.rcvComprasDetalle.push(...detalle.datos);
          }
        } catch (err: any) {
          console.warn(`extraerDatos: detalle compras DTE ${item.dcv_tipo}:`, err.message);
        }
      }
    }
  }

  const periodoVentas = result.rcvVentasResumen?.periodo || per;
  if (result.rcvVentasResumen?.resumen) {
    for (const item of result.rcvVentasResumen.resumen) {
      if (item.cantidad > 0) {
        try {
          const detalle = await getRcvVentasDetalle(
            empresaRut, periodoVentas, String(item.dcv_tipo), siiRut, siiClave
          );
          if (detalle?.datos) {
            result.rcvVentasDetalle.push(...detalle.datos);
          }
        } catch (err: any) {
          console.warn(`extraerDatos: detalle ventas DTE ${item.dcv_tipo}:`, err.message);
        }
      }
    }
  }

  return result;
}

export function formatRut(rut: string): string {
  return rut.replace(/\./g, "").replace(/\s/g, "").trim();
}

export function splitRut(rut: string): { numero: string; dv: string } {
  const clean = formatRut(rut);
  const parts = clean.split("-");
  return { numero: parts[0], dv: parts[1] || "" };
}
