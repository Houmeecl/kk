const BOOSTR_BASE_URL = "https://api.boostr.cl";

export interface VehicleInfo {
  plate: string;
  brand?: string;
  model?: string;
  year?: number;
  type?: string;
  fuel_type?: string;
  engine_size?: string;
  km?: number;
  color?: string;
  transmission?: string;
  owner_name?: string;
  owner_rut?: string;
}

export async function getVehicleByPlate(plate: string): Promise<VehicleInfo | null> {
  const apiKey = process.env.BOOSTR_API_KEY;
  if (!apiKey) {
    console.warn("BOOSTR_API_KEY no configurado — no se puede consultar vehículo");
    return null;
  }

  const cleanPlate = plate.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (!cleanPlate || cleanPlate.length < 4) return null;

  try {
    const url = `${BOOSTR_BASE_URL}/vehicle/${cleanPlate}.json?include=owner`;
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      console.warn(`Boostr API error ${res.status} for plate ${cleanPlate}`);
      return null;
    }

    const data = await res.json();
    if (data.status === "error" || !data.data) return null;

    const v = data.data;
    return {
      plate: cleanPlate,
      brand: v.brand || v.marca,
      model: v.model || v.modelo,
      year: v.year || v.anio,
      type: v.type || v.tipo,
      fuel_type: v.fuel_type || v.tipo_combustible || v.bencina,
      engine_size: v.engine_size || v.motor,
      km: v.km || v.kilometraje,
      color: v.color,
      transmission: v.transmission || v.transmision,
      owner_name: v.owner?.name || v.owner?.nombre,
      owner_rut: v.owner?.rut,
    };
  } catch (err: any) {
    console.warn("Boostr API error:", err.message);
    return null;
  }
}

export function estimateEmissionFactor(vehicle: VehicleInfo | null): {
  factorKgCo2PerKm: number;
  fuelType: string;
  methodology: string;
} {
  if (!vehicle) {
    return {
      factorKgCo2PerKm: 0.21,
      fuelType: "desconocido",
      methodology: "Factor promedio flota Chile (MMA HuellaChile 2024)",
    };
  }

  const fuel = (vehicle.fuel_type || "").toLowerCase();
  const engineSize = parseFloat(vehicle.engine_size || "0");

  if (fuel.includes("diesel") || fuel.includes("diésel") || fuel.includes("petroleo")) {
    if (engineSize > 3.0) return { factorKgCo2PerKm: 0.33, fuelType: "Diésel (motor >3.0L)", methodology: "HuellaChile MMA 2024 — Diésel pesado" };
    return { factorKgCo2PerKm: 0.27, fuelType: "Diésel", methodology: "HuellaChile MMA 2024 — Factor 2.68 kgCO2/L diésel" };
  }

  if (fuel.includes("gas") || fuel.includes("gnc") || fuel.includes("glp")) {
    return { factorKgCo2PerKm: 0.18, fuelType: "Gas (GNC/GLP)", methodology: "HuellaChile MMA 2024 — Gas vehicular" };
  }

  if (fuel.includes("electr") || fuel.includes("eléctric")) {
    return { factorKgCo2PerKm: 0.05, fuelType: "Eléctrico", methodology: "Factor emisión SEN Chile 2024 (0.35 kgCO2/kWh × 0.15 kWh/km)" };
  }

  if (fuel.includes("hybrid") || fuel.includes("híbrido")) {
    return { factorKgCo2PerKm: 0.12, fuelType: "Híbrido", methodology: "HuellaChile MMA 2024 — Híbrido promedio" };
  }

  if (engineSize > 2.5) return { factorKgCo2PerKm: 0.28, fuelType: "Gasolina (>2.5L)", methodology: "HuellaChile MMA 2024 — 2.31 kgCO2/L gasolina" };
  if (engineSize > 1.6) return { factorKgCo2PerKm: 0.21, fuelType: "Gasolina (1.6-2.5L)", methodology: "HuellaChile MMA 2024 — 2.31 kgCO2/L gasolina" };

  return { factorKgCo2PerKm: 0.17, fuelType: "Gasolina (<1.6L)", methodology: "HuellaChile MMA 2024 — 2.31 kgCO2/L gasolina" };
}
