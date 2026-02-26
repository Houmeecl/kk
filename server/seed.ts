import { db } from "./db";
import { companies, taxReports, greenEntries, users } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  // Check if companies exist
  const existingCompanies = await db.select().from(companies);
  if (existingCompanies.length > 0) return;

  // Create a default admin user if not exists
  const existingUsers = await db.select().from(users);
  let adminId;
  if (existingUsers.length === 0) {
    const [admin] = await db.insert(users).values({
      email: "admin@kontax.cl",
      firstName: "Admin",
      lastName: "KONTAX",
      role: "admin",
    }).returning();
    adminId = admin.id;
  } else {
    adminId = existingUsers[0].id;
  }

  // Create Company
  const [company1] = await db.insert(companies).values({
    rut: "11.748.297-9",
    businessName: "HERNAN FERNANDO AGUIRRE TORRES",
    contactEmail: "hector.rojas.cisternas@gmail.com",
    officeAddress: "OFICINA: OVALLE. V. MACKENNA 310 OF. 102, OVALLE",
    companySize: "MICRO EMPRESA",
    segment: "MICRO EMPRESA",
    segmentFrom: "01-01-2024",
    addresses: [
      {
        code: "64396786",
        type: "DOMICILIO",
        address: "HIJUELA 35 HURTADO CIUDAD RIO HURTADO COMUNA RIO HURTADO REGION DE COQUIMBO",
        from: "07-01-2013",
      },
    ],
    constitutionDate: "NO",
    startDate: "07-01-2013",
    endDate: "NO",
    activities: [
      { name: "CULTIVO DE UVA DESTINADA A LA PRODUCCION DE PISCO Y AGUARDIENTE", code: "012111", category: "1", affectsIva: true, from: "07-01-2013" },
      { name: "PREPARACION DEL TERRENO", code: "431200", category: "1", affectsIva: true, from: "17-11-2014" },
      { name: "TRANSPORTE DE CARGA POR CARRETERA", code: "492300", category: "1", affectsIva: true, from: "07-01-2013" },
    ],
    taxRegime: "REGIMEN PRO PYME GENERAL (14D)",
    taxRegimeFrom: "01-01-2020",
  }).returning();

  // Create Tax Report
  await db.insert(taxReports).values({
    companyId: company1.id,
    requestedBy: "Edward Venegas",
    requestedByEmail: "edwardvenegasb@gmail.com",
    incomeHistory: [
      { year: 2021, amount: "36,59 UF" },
      { year: 2022, amount: "70,92 UF" },
      { year: 2023, amount: "784,06 UF" },
    ],
    fines: "Sin Multas",
    notifications: "Sin Información",
    properties: "Sin Propiedades asociadas en SII",
    propertyDebts: "Sin Deudas",
    postponedIva: "Sin IVAs Postergados",
    f29Declared: "Sin F29 sin declarar",
    f29Observed: "Sin F29 Observados",
    integralConsultation: [
      { month: "Enero", values: { "2024": "S/O", "2023": "S/O" } },
      { month: "Febrero", values: { "2024": "S/O", "2023": "S/O" } },
      { month: "Marzo", values: { "2024": "S/O", "2023": "S/O" } },
      { month: "Abril", values: { "2024": "S/D", "2023": "S/O" } },
    ],
    f50Declared: [],
    f50Status: "3 F50 sin declarar",
    f22Observed: "2024 sin observaciones en F22",
    swornDeclarations: [
      { year: 2024, status: "Sin DDJJ Observadas" },
    ],
    presumedDefaults: "Sin Moras Presuntas",
    tgrDebts: "Sin Deudas",
    tgrFiles: "Sin Expedientes",
    tgrAgreements: "Sin Convenios Vigentes",
    previredDnp: "Sin Información",
    previredPayments: "Sin Información",
    commercialBulletin: "Sin Documentos Impagos",
    commercialBulletinUf: "Sin Documentos Impagos en UF",
    complianceScore: 85,
  });

  // Create Green Entries
  await db.insert(greenEntries).values([
    {
      companyId: company1.id,
      date: new Date("2024-01-15"),
      period: "2024-01",
      category: "Energía",
      subcategory: "Electricidad",
      description: "Factura 4452 - ENEL Distribución Chile S.A.",
      physicalQuantity: 1250.5,
      physicalUnit: "kWh",
      monetaryValue: 185000,
      currency: "CLP",
      co2Equivalent: 487.2,
      methodology: "Factor SEN 2024 (0.3896 kgCO2e/kWh)",
      scope: "Alcance 2",
      odsAlignment: "ODS 7, ODS 13",
      tmasClassification: "Sostenible (Eficiencia)",
      status: "verificado",
      createdBy: adminId,
    },
    {
      companyId: company1.id,
      date: new Date("2024-01-20"),
      period: "2024-01",
      category: "Transporte",
      subcategory: "Diésel",
      description: "Factura 8821 - COPEC S.A. (Flota propia)",
      physicalQuantity: 450,
      physicalUnit: "Litros",
      monetaryValue: 520000,
      currency: "CLP",
      co2Equivalent: 1206,
      methodology: "Factor HuellaChile (2.68 kgCO2e/L)",
      scope: "Alcance 1",
      odsAlignment: "ODS 9, ODS 13",
      tmasClassification: "Transición",
      status: "verificado",
      createdBy: adminId,
    },
    {
      companyId: company1.id,
      date: new Date("2024-01-25"),
      period: "2024-01",
      category: "Agua",
      subcategory: "Consumo Red",
      description: "Factura 9912 - Aguas Andinas S.A.",
      physicalQuantity: 85,
      physicalUnit: "m3",
      monetaryValue: 95000,
      currency: "CLP",
      co2Equivalent: 25.5,
      methodology: "Factor Tratamiento (0.3 kgCO2e/m3)",
      scope: "Alcance 3",
      odsAlignment: "ODS 6",
      tmasClassification: "Sostenible",
      status: "verificado",
      createdBy: adminId,
    },
    {
      companyId: company1.id,
      date: new Date("2024-02-05"),
      period: "2024-02",
      category: "Inversión Verde",
      subcategory: "Eficiencia Energética",
      description: "Factura 1102 - Instalación Paneles Solares (Mitigación)",
      physicalQuantity: 1,
      physicalUnit: "Sistema",
      monetaryValue: 4500000,
      currency: "CLP",
      co2Equivalent: -850,
      methodology: "Estimación ahorro anual (Mitigación)",
      scope: "Activo Ambiental",
      odsAlignment: "ODS 7, ODS 13",
      tmasClassification: "Sostenible",
      status: "verificado",
      createdBy: adminId,
    }
  ]);

  console.log("Database seeded with KONTAX sample data");
}
