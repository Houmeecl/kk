import { storage } from "../storage";
import type { GreenEntry } from "@shared/schema";

export interface AnalyticsInsight {
  type: "warning" | "success" | "info";
  title: string;
  description: string;
}

export interface AnalyticsReport {
  companyId: string;
  greenScore: number;
  totalEmissionsTco2e: number;
  mitigatedEmissionsTco2e: number;
  netEmissionsTco2e: number;
  sustainableInvestmentClp: number;
  naturalCapitalMma: {
    activosAmbientalesTco2e: number;
    pasivosAmbientalesTco2e: number;
    patrimonioAmbientalTco2e: number;
    ecuacionContable: string;
  };
  insights: AnalyticsInsight[];
}

export class EnvironmentalAnalyticsAgent {
  /**
   * Genera un reporte analítico ambiental completo para una empresa basándose en sus asientos verdes
   * siguiendo la normativa de partida doble y contabilidad T-MAS.
   */
  async generateAnalyticsReport(companyId: string): Promise<AnalyticsReport> {
    const entries = await storage.getGreenEntries(companyId);
    
    // Si no hay datos, retornar un reporte vacío
    if (!entries || entries.length === 0) {
      return {
        companyId,
        greenScore: 0,
        totalEmissionsTco2e: 0,
        mitigatedEmissionsTco2e: 0,
        netEmissionsTco2e: 0,
        sustainableInvestmentClp: 0,
        naturalCapitalMma: {
          activosAmbientalesTco2e: 0,
          pasivosAmbientalesTco2e: 0,
          patrimonioAmbientalTco2e: 0,
          ecuacionContable: "Capital Natural = Pasivos Amb. + Patrimonio Amb."
        },
        insights: [{
          type: "info",
          title: "Sin datos contables",
          description: "No existen asientos verdes registrados para generar análisis ambiental."
        }]
      };
    }

    let totalEmissions = 0;
    let mitigatedEmissions = 0;
    let totalMonetary = 0;
    let sustainableMonetary = 0;

    const categoryEmissions: Record<string, number> = {};

    entries.forEach(entry => {
      const co2 = entry.co2Equivalent || 0;
      // Soporte para nueva estructura de Partida Doble o fallback a la antigua
      const amount = entry.debeMonto || entry.haberMonto || entry.monetaryValue || 0;
      const isSustainable = entry.tmasClassification?.includes("sostenible");

      if (co2 > 0) {
        totalEmissions += co2;
      } else {
        mitigatedEmissions += Math.abs(co2);
      }

      totalMonetary += Math.abs(amount);
      if (isSustainable) {
        sustainableMonetary += Math.abs(amount);
      }

      categoryEmissions[entry.category] = (categoryEmissions[entry.category] || 0) + Math.max(0, co2);
    });

    const netEmissions = totalEmissions - mitigatedEmissions;

    // Calcular Green Score (0 - 100) KONTAX
    let greenScore = 0;
    if (totalMonetary > 0) {
      const monetaryScore = (sustainableMonetary / totalMonetary) * 60; // 60% peso financiero sostenible
      const mitigationScore = totalEmissions > 0 ? Math.min(40, (mitigatedEmissions / totalEmissions) * 40) : 40; // 40% peso mitigación CO2
      greenScore = Math.round(monetaryScore + mitigationScore);
    }

    const insights: AnalyticsInsight[] = [];

    if (greenScore >= 80) {
      insights.push({
        type: "success",
        title: "Excelente Desempeño Ambiental",
        description: "Su alineación con la taxonomía T-MAS indica un fuerte liderazgo en sostenibilidad."
      });
    } else if (greenScore < 40) {
      insights.push({
        type: "warning",
        title: "Oportunidad de Mejora",
        description: "Baja proporción de gastos sostenibles. Considere invertir en eficiencia energética o modelos de transición."
      });
    }

    if (mitigatedEmissions === 0 && totalEmissions > 1000) { 
      insights.push({
        type: "warning",
        title: "Ausencia de Mitigación",
        description: "No registra acciones contables de compensación o mitigación de huella de carbono en el período activo."
      });
    }

    let topCategory = "";
    let maxCatEmissions = 0;
    for (const [cat, emissions] of Object.entries(categoryEmissions)) {
      if (emissions > maxCatEmissions) {
        maxCatEmissions = emissions;
        topCategory = cat;
      }
    }

    if (topCategory) {
      insights.push({
        type: "info",
        title: "Principal Fuente de Emisiones",
        description: `La categoría contable '${topCategory}' representa el mayor volumen de emisiones. Se recomienda foco de inversión verde aquí.`
      });
    }

    // Ecuación de Capital Natural (Metodología SEEA y KONTAX MMA)
    // Capital Natural = Pasivos Ambientales + Patrimonio Ambiental
    // Patrimonio Ambiental = Capital Natural (Activos Mitigados) - Pasivos Ambientales (Emisiones)
    const activosAmbientalesTco2e = mitigatedEmissions / 1000;
    const pasivosAmbientalesTco2e = totalEmissions / 1000;
    const patrimonioAmbientalTco2e = activosAmbientalesTco2e - pasivosAmbientalesTco2e;

    return {
      companyId,
      greenScore,
      totalEmissionsTco2e: pasivosAmbientalesTco2e,
      mitigatedEmissionsTco2e: activosAmbientalesTco2e,
      netEmissionsTco2e: netEmissions / 1000,
      sustainableInvestmentClp: sustainableMonetary,
      naturalCapitalMma: {
        activosAmbientalesTco2e,
        pasivosAmbientalesTco2e,
        patrimonioAmbientalTco2e,
        ecuacionContable: "Capital Natural = Pasivos Amb. + Patrimonio Amb."
      },
      insights
    };
  }
}

export const analyticsAgent = new EnvironmentalAnalyticsAgent();
