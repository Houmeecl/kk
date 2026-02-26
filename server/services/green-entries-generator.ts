import type { ExtraccionCompleta, RcvDetalle } from "./apigateway";
import { DTE_TYPES } from "./apigateway";

type DocumentoDetalle = RcvDetalle["datos"][number];

export interface GreenEntryData {
  category: string;
  subcategory: string;
  description: string;
  physicalQuantity: number;
  physicalUnit: string;
  debeCuenta?: string;
  debeNombre?: string;
  debeMonto?: number;
  haberCuenta?: string;
  haberNombre?: string;
  haberMonto?: number;
  monetaryValue: number;
  co2Equivalent: number;
  methodology: string;
  scope: string;
  odsAlignment: string;
  tmasClassification: string;
}

const FACTORES_HUELLACHILE_2024 = {
  electricidad_kwh: 0.3896,
  gasolina_litro: 2.31,
  diesel_litro: 2.68,
  gas_natural_m3: 2.04,
  glp_kg: 2.95,
  agua_m3: 0.344,
  transporte_km_liviano: 0.21,
  transporte_km_pesado: 0.33,
  residuos_relleno_kg: 1.15,
  papel_reciclado_kg: -0.7,
};

const PRECIO_PROMEDIO: Record<string, number> = {
  electricidad_kwh: 150,
  diesel_litro: 1100,
  gasolina_litro: 1200,
  gas_m3: 800,
  agua_m3: 1500,
};

interface ClasificacionProveedor {
  category: string;
  subcategory: string;
  scope: string;
  tmas: string;
  ods: string;
  recurso: string;
  unidadFisica: string;
  precioUnitario: number;
  factorCo2: number;
  tmasStatus: "sostenible" | "transición" | "no alineada";
}

function clasificarProveedor(razonSocial: string): ClasificacionProveedor {
  const n = (razonSocial || "").toUpperCase();

  if (/ELECTR|ENERG|CGE|ENEL|CHILQUINTA|SAESA|FRONTEL|LUZ|POWER|CHILENER|COLBUN/.test(n)) {
    return { category: "Energía", subcategory: "Electricidad", scope: "Alcance 2", tmas: "EA.131", ods: "ODS 7, ODS 13", recurso: "electricidad", unidadFisica: "kWh", precioUnitario: PRECIO_PROMEDIO.electricidad_kwh, factorCo2: FACTORES_HUELLACHILE_2024.electricidad_kwh, tmasStatus: "transición" };
  }
  if (/COPEC|SHELL|PETROBRAS|ENAP|DIESEL|BENCINA|COMBUST|PETROLEO|TERPEL|PETROL/.test(n)) {
    return { category: "Energía", subcategory: "Combustible fósil", scope: "Alcance 1", tmas: "EA.132", ods: "ODS 13", recurso: "combustible", unidadFisica: "litros", precioUnitario: PRECIO_PROMEDIO.diesel_litro, factorCo2: FACTORES_HUELLACHILE_2024.diesel_litro, tmasStatus: "no alineada" };
  }
  if (/GAS|GASCO|LIPIGAS|ABASTIBLE|GLP|GNL/.test(n)) {
    return { category: "Energía", subcategory: "Gas", scope: "Alcance 1", tmas: "EA.132", ods: "ODS 13", recurso: "gas", unidadFisica: "m³", precioUnitario: PRECIO_PROMEDIO.gas_m3, factorCo2: FACTORES_HUELLACHILE_2024.gas_natural_m3, tmasStatus: "transición" };
  }
  if (/AGUA|ESSBIO|AGUAS ANDINAS|SMAPA|SANITARI|ESVAL|NUEVOSUR|AGUAS DEL VALLE|AGUAS CHANAR/.test(n)) {
    return { category: "Agua", subcategory: "Consumo hídrico", scope: "Alcance 1", tmas: "EA.141", ods: "ODS 6", recurso: "agua", unidadFisica: "m³", precioUnitario: PRECIO_PROMEDIO.agua_m3, factorCo2: FACTORES_HUELLACHILE_2024.agua_m3, tmasStatus: "transición" };
  }
  if (/TRANSPORT|LOGIST|FLETE|CARGA|COURIER|CHILEXPRESS|STARKEN|CORREOS|BLUE EXPRESS|BOOSTR|DLOG|BEETRACK/.test(n)) {
    return { category: "Transporte", subcategory: "Transporte terceros", scope: "Alcance 3", tmas: "EA.133", ods: "ODS 11, ODS 13", recurso: "transporte", unidadFisica: "km est.", precioUnitario: 250, factorCo2: FACTORES_HUELLACHILE_2024.transporte_km_liviano, tmasStatus: "transición" };
  }
  if (/RESIDU|RECICLAJ|BASURA|DESECHO|LIMPIEZA IND|KDM|VEOLIA|STERICYCLE|HIDRONOR/.test(n)) {
    return { category: "Residuos", subcategory: "Gestión de residuos", scope: "Alcance 3", tmas: "EA.211", ods: "ODS 12", recurso: "residuos", unidadFisica: "kg est.", precioUnitario: 200, factorCo2: FACTORES_HUELLACHILE_2024.residuos_relleno_kg, tmasStatus: "transición" };
  }
  if (/SOLAR|PANEL|FOTOVOLT|RENOVABL|EOLIC|SUNPOWER|TRINA/.test(n)) {
    return { category: "Inversión Verde", subcategory: "Energía renovable", scope: "Alcance 2", tmas: "EA.311", ods: "ODS 7, ODS 13", recurso: "renovable", unidadFisica: "kWh evit.", precioUnitario: 120, factorCo2: -FACTORES_HUELLACHILE_2024.electricidad_kwh, tmasStatus: "sostenible" };
  }
  if (/CONSTRUC|MATERIAL|FERRET|CEMENTOS|ACERO|HORMIGON|SODIMAC|EASY|MTS/.test(n)) {
    return { category: "Emisiones", subcategory: "Materiales construcción", scope: "Alcance 3", tmas: "EA.112", ods: "ODS 9, ODS 12", recurso: "materiales", unidadFisica: "CLP", precioUnitario: 1, factorCo2: 0.0006, tmasStatus: "no alineada" };
  }
  if (/QUIMIC|LABORAT|PLAGUICID|FERTILIZ|AGROQUIM|BAYER|SYNGENTA|ANASAC/.test(n)) {
    return { category: "Emisiones", subcategory: "Agroquímicos", scope: "Alcance 3", tmas: "EA.113", ods: "ODS 12, ODS 15", recurso: "químicos", unidadFisica: "CLP", precioUnitario: 1, factorCo2: 0.0007, tmasStatus: "no alineada" };
  }
  if (/ALIMENT|RESTAURANT|CATERING|CAFÉ|CAFETERÍA|SODEXO|ARAMARK/.test(n)) {
    return { category: "Residuos", subcategory: "Residuos orgánicos", scope: "Alcance 3", tmas: "EA.213", ods: "ODS 2, ODS 12", recurso: "orgánicos", unidadFisica: "kg est.", precioUnitario: 300, factorCo2: 0.58, tmasStatus: "transición" };
  }
  if (/ARRIENDO|INMOBIL|LEASING|RENTA/.test(n)) {
    return { category: "Emisiones", subcategory: "Infraestructura", scope: "Alcance 3", tmas: "EA.100", ods: "ODS 11", recurso: "infraestructura", unidadFisica: "CLP", precioUnitario: 1, factorCo2: 0.00005, tmasStatus: "transición" };
  }

  return { category: "Emisiones", subcategory: "Cadena de valor", scope: "Alcance 3", tmas: "EA.100", ods: "ODS 12, ODS 13", recurso: "general", unidadFisica: "CLP", precioUnitario: 1, factorCo2: 0.00025, tmasStatus: "no alineada" };
}

function estimarCantidadFisica(montoNeto: number, clasificacion: ClasificacionProveedor): number {
  if (clasificacion.precioUnitario <= 1) return Math.abs(montoNeto);
  return Math.round(Math.abs(montoNeto) / clasificacion.precioUnitario);
}

function calcularCo2(cantidadFisica: number, clasificacion: ClasificacionProveedor): number {
  if (clasificacion.unidadFisica === "CLP") {
    return Math.round(cantidadFisica * clasificacion.factorCo2);
  }
  return Math.round(cantidadFisica * clasificacion.factorCo2 * 100) / 100;
}

export function generarAsientosVerdes(
  extraccion: ExtraccionCompleta,
  periodo: string
): GreenEntryData[] {
  const entries: GreenEntryData[] = [];

  if (extraccion.rcvComprasDetalle.length > 0) {
    const porProveedor = new Map<string, { docs: DocumentoDetalle[]; clas: ClasificacionProveedor }>();

    for (const doc of extraccion.rcvComprasDetalle) {
      const key = doc.dcv_rut || doc.dcv_razon_social || "SIN-RUT";
      if (!porProveedor.has(key)) {
        porProveedor.set(key, {
          docs: [],
          clas: clasificarProveedor(doc.dcv_razon_social || ""),
        });
      }
      porProveedor.get(key)!.docs.push(doc);
    }

    for (const [_rut, { docs, clas }] of Array.from(porProveedor.entries())) {
      const totalNeto = docs.reduce((s: number, d: any) => s + (d.dcv_monto_neto || 0), 0);
      const totalMonto = docs.reduce((s: number, d: any) => s + (d.dcv_monto_total || 0), 0);
      const razonSocial = docs[0]?.dcv_razon_social || _rut;
      const tiposDte = Array.from(new Set(docs.map((d: any) => d.dcv_tipo)));
      const tiposStr = tiposDte.map(t => DTE_TYPES[t] || `DTE ${t}`).join(", ");

      const cantidadFisica = estimarCantidadFisica(totalNeto, clas);
      const co2 = calcularCo2(cantidadFisica, clas);

      entries.push({
        category: clas.category,
        subcategory: clas.subcategory,
        description: `${razonSocial} — ${docs.length} doc(s) [${tiposStr}] — Neto $${totalNeto.toLocaleString("es-CL")}`,
        physicalQuantity: cantidadFisica,
        physicalUnit: clas.unidadFisica,
        debeCuenta: "CTA-VERDE",
        debeNombre: clas.category,
        debeMonto: totalMonto,
        haberCuenta: "CTA-PROV",
        haberNombre: "Proveedores",
        haberMonto: totalMonto,
        monetaryValue: totalMonto,
        co2Equivalent: clas.factorCo2 < 0 ? -Math.abs(co2) : co2,
        methodology: `HuellaChile MMA 2024 — Factor ${clas.factorCo2} kgCO2/${clas.unidadFisica} — ${clas.recurso}`,
        scope: clas.scope,
        odsAlignment: clas.ods,
        tmasClassification: `${clas.tmas} (${clas.tmasStatus})`,
      });
    }
  } else if (extraccion.rcvComprasResumen?.resumen) {
    for (const item of extraccion.rcvComprasResumen.resumen) {
      if (item.cantidad === 0) continue;
      const tipoNombre = DTE_TYPES[item.dcv_tipo] || `DTE ${item.dcv_tipo}`;

      let scope = "Alcance 3";
      let tmas = "EA.100";
      let category = "Emisiones";
      let subcategory = "Cadena de valor (resumen)";

      if (item.dcv_tipo === 52) {
        category = "Transporte";
        subcategory = "Guías de Despacho";
        scope = "Alcance 3";
        tmas = "EA.133";
      }

      const co2 = Math.round(Math.abs(item.monto_neto) * 0.00025);

      entries.push({
        category,
        subcategory,
        description: `Compras ${tipoNombre} — ${item.cantidad} docs — Neto $${item.monto_neto.toLocaleString("es-CL")} — Período ${periodo}`,
        physicalQuantity: item.cantidad,
        physicalUnit: "documentos",
        debeCuenta: "CTA-VERDE",
        debeNombre: category,
        debeMonto: item.monto_total,
        haberCuenta: "CTA-PROV",
        haberNombre: "Proveedores",
        haberMonto: item.monto_total,
        monetaryValue: item.monto_total,
        co2Equivalent: co2,
        methodology: "SEEA-CF / RCV Resumen SII — Factor monetario genérico",
        scope,
        odsAlignment: "ODS 12, ODS 13",
        tmasClassification: `${tmas} (no alineada)`,
      });
    }
  }

  if (extraccion.rcvVentasDetalle.length > 0) {
    const porTipo = new Map<number, { docs: DocumentoDetalle[]; totalNeto: number; totalMonto: number }>();
    for (const doc of extraccion.rcvVentasDetalle) {
      if (!porTipo.has(doc.dcv_tipo)) porTipo.set(doc.dcv_tipo, { docs: [], totalNeto: 0, totalMonto: 0 });
      const g = porTipo.get(doc.dcv_tipo)!;
      g.docs.push(doc);
      g.totalNeto += doc.dcv_monto_neto || 0;
      g.totalMonto += doc.dcv_monto_total || 0;
    }

    for (const [tipo, data] of Array.from(porTipo.entries())) {
      const tipoNombre = DTE_TYPES[tipo] || `DTE ${tipo}`;
      const isGuia = tipo === 52;
      const co2 = Math.round(Math.abs(data.totalNeto) * (isGuia ? 0.0004 : 0.00008));

      entries.push({
        category: isGuia ? "Transporte" : "Emisiones",
        subcategory: isGuia ? "Despachos emitidos" : "Actividad productiva",
        description: `Ventas ${tipoNombre} — ${data.docs.length} docs — Neto $${data.totalNeto.toLocaleString("es-CL")}`,
        physicalQuantity: data.docs.length,
        physicalUnit: "documentos emitidos",
        debeCuenta: "CTA-CLIENTES",
        debeNombre: "Clientes",
        debeMonto: data.totalMonto,
        haberCuenta: "CTA-VERDE-ING",
        haberNombre: isGuia ? "Transporte" : "Emisiones",
        haberMonto: data.totalMonto,
        monetaryValue: data.totalMonto,
        co2Equivalent: co2,
        methodology: isGuia ? "GHG Protocol — Factor logístico por guía" : "SEEA-CF — Factor productivo por ventas",
        scope: isGuia ? "Alcance 1" : "Alcance 1",
        odsAlignment: isGuia ? "ODS 11, ODS 13" : "ODS 8, ODS 12",
        tmasClassification: isGuia ? "EA.133 (transición)" : "EA.110 (transición)",
      });
    }
  } else if (extraccion.rcvVentasResumen?.resumen) {
    for (const item of extraccion.rcvVentasResumen.resumen) {
      if (item.cantidad === 0) continue;
      const tipoNombre = DTE_TYPES[item.dcv_tipo] || `DTE ${item.dcv_tipo}`;
      const isGuia = item.dcv_tipo === 52;
      const co2 = Math.round(Math.abs(item.monto_neto) * (isGuia ? 0.0004 : 0.00008));

      entries.push({
        category: isGuia ? "Transporte" : "Emisiones",
        subcategory: isGuia ? "Despachos emitidos" : "Actividad productiva",
        description: `Ventas ${tipoNombre} — ${item.cantidad} docs — Período ${periodo}`,
        physicalQuantity: item.cantidad,
        physicalUnit: "documentos",
        debeCuenta: "CTA-CLIENTES",
        debeNombre: "Clientes",
        debeMonto: item.monto_total,
        haberCuenta: "CTA-VERDE-ING",
        haberNombre: isGuia ? "Transporte" : "Emisiones",
        haberMonto: item.monto_total,
        monetaryValue: item.monto_total,
        co2Equivalent: co2,
        methodology: "SEEA-CF / RCV Ventas Resumen SII",
        scope: "Alcance 1",
        odsAlignment: "ODS 8, ODS 12",
        tmasClassification: isGuia ? "EA.133 (transición)" : "EA.110 (transición)",
      });
    }
  }

  if (extraccion.rcvComprasDetalle.length > 0) {
    const guias = extraccion.rcvComprasDetalle.filter(d => d.dcv_tipo === 52);
    if (guias.length > 0) {
      const kmEstimado = guias.length * 120;
      const totalMonto = guias.reduce((s, d) => s + (d.dcv_monto_total || 0), 0);
      const co2 = Math.round(kmEstimado * FACTORES_HUELLACHILE_2024.transporte_km_liviano);

      entries.push({
        category: "Transporte",
        subcategory: "Guías de despacho recibidas",
        description: `${guias.length} guías de despacho — ${kmEstimado} km logísticos estimados (120 km/guía promedio Chile)`,
        physicalQuantity: kmEstimado,
        physicalUnit: "km estimados",
        debeCuenta: "CTA-VERDE",
        debeNombre: "Transporte",
        debeMonto: totalMonto,
        haberCuenta: "CTA-PROV",
        haberNombre: "Proveedores",
        haberMonto: totalMonto,
        monetaryValue: totalMonto,
        co2Equivalent: co2,
        methodology: `HuellaChile MMA 2024 — ${FACTORES_HUELLACHILE_2024.transporte_km_liviano} kgCO2/km vehículo liviano`,
        scope: "Alcance 3",
        odsAlignment: "ODS 11, ODS 13",
        tmasClassification: "EA.133 (transición)",
      });
    }
  }

  return entries;
}
