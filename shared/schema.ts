import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rut: text("rut").notNull().unique(),
  businessName: text("business_name").notNull(),
  contactEmail: text("contact_email"),
  officeAddress: text("office_address"),
  companySize: text("company_size"),
  segment: text("segment"),
  segmentFrom: text("segment_from"),
  addresses: jsonb("addresses").$type<Address[]>().default([]),
  constitutionDate: text("constitution_date"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  activities: jsonb("activities").$type<EconomicActivity[]>().default([]),
  taxRegime: text("tax_regime"),
  taxRegimeFrom: text("tax_regime_from"),
  assignedAuditorId: varchar("assigned_auditor_id"),
  invitationStatus: text("invitation_status").default("pending"),
  siiLinked: boolean("sii_linked").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taxReports = pgTable("tax_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  requestedBy: text("requested_by").notNull(),
  requestedByEmail: text("requested_by_email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  incomeHistory: jsonb("income_history").$type<IncomeRecord[]>().default([]),
  fines: text("fines").default("Sin Multas"),
  notifications: text("notifications").default("Sin Información"),
  properties: text("properties").default("Sin Propiedades asociadas en SII"),
  propertyDebts: text("property_debts").default("Sin Deudas"),
  postponedIva: text("postponed_iva").default("Sin IVAs Postergados"),
  f29Declared: text("f29_declared").default("Sin F29 sin declarar"),
  f29Observed: text("f29_observed").default("Sin F29 Observados"),
  integralConsultation: jsonb("integral_consultation").$type<IntegralRow[]>().default([]),
  f50Declared: jsonb("f50_declared").$type<F50Record[]>().default([]),
  f50Status: text("f50_status"),
  f22Observed: text("f22_observed").default("Sin observaciones en F22"),
  swornDeclarations: jsonb("sworn_declarations").$type<SwornDeclaration[]>().default([]),
  presumedDefaults: text("presumed_defaults").default("Sin Moras Presuntas"),
  tgrDebts: text("tgr_debts").default("Sin Deudas"),
  tgrFiles: text("tgr_files").default("Sin Expedientes"),
  tgrAgreements: text("tgr_agreements").default("Sin Convenios Vigentes"),
  previredDnp: text("previred_dnp").default("Sin Información"),
  previredPayments: text("previred_payments").default("Sin Información"),
  commercialBulletin: text("commercial_bulletin").default("Sin Documentos Impagos"),
  commercialBulletinUf: text("commercial_bulletin_uf").default("Sin Documentos Impagos en UF"),
  complianceScore: integer("compliance_score").default(100),
});

export const greenEntries = pgTable("green_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  date: timestamp("date").notNull(),
  period: text("period").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  description: text("description").notNull(),
  physicalQuantity: real("physical_quantity"),
  physicalUnit: text("physical_unit"),
  debeCuenta: text("debe_cuenta"),
  debeNombre: text("debe_nombre"),
  debeMonto: real("debe_monto"),
  haberCuenta: text("haber_cuenta"),
  haberNombre: text("haber_nombre"),
  haberMonto: real("haber_monto"),
  consumoAguaM3: real("consumo_agua_m3"),
  residuosKg: real("residuos_kg"),
  alcanceGei: integer("alcance_gei"),
  monetaryValue: real("monetary_value"),
  currency: text("currency").default("CLP"),
  co2Equivalent: real("co2_equivalent"),
  methodology: text("methodology"),
  scope: text("scope"),
  odsAlignment: text("ods_alignment"),
  tmasClassification: text("tmas_classification"),
  supportDoc: text("support_doc"),
  status: text("status").default("pendiente"),
  createdBy: varchar("created_by"),
  reviewedBy: varchar("reviewed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const environmentalBalances = pgTable("environmental_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  period: text("period").notNull(),
  assets: jsonb("assets").$type<BalanceItem[]>().default([]),
  liabilities: jsonb("liabilities").$type<BalanceItem[]>().default([]),
  netResult: real("net_result").default(0),
  carbonFootprint: jsonb("carbon_footprint").$type<CarbonSummary>(),
  energySummary: jsonb("energy_summary").$type<EnergySummary>(),
  waterSummary: jsonb("water_summary").$type<WaterSummary>(),
  wasteSummary: jsonb("waste_summary").$type<WasteSummary>(),
  signedBy: varchar("signed_by"),
  signedAt: timestamp("signed_at"),
  status: text("status").default("borrador"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clientInvitations = pgTable("client_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id"),
  invitedByUserId: varchar("invited_by_user_id").notNull(),
  clientEmail: text("client_email").notNull(),
  clientName: text("client_name").notNull(),
  clientRut: text("client_rut"),
  token: text("token").notNull().unique(),
  status: text("status").default("pending"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  expiresAt: timestamp("expires_at").notNull(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export interface Address {
  code: string;
  type: string;
  address: string;
  from: string;
}

export interface EconomicActivity {
  name: string;
  code: string;
  category: string;
  affectsIva: boolean;
  from: string;
}

export interface IncomeRecord {
  year: number;
  amount: string;
}

export interface IntegralRow {
  month: string;
  values: Record<string, string>;
}

export interface F50Record {
  year: number;
  month: string;
  folio: string;
  status: string;
}

export interface SwornDeclaration {
  year: number;
  status: string;
}

export interface BalanceItem {
  name: string;
  value: number;
  unit: string;
  category: string;
}

export interface CarbonSummary {
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
  unit: string;
  trend: number;
}

export interface EnergySummary {
  totalKwh: number;
  renewablePercent: number;
  trend: number;
}

export interface WaterSummary {
  totalM3: number;
  reutilizedPercent: number;
  trend: number;
}

export interface WasteSummary {
  totalKg: number;
  recycledPercent: number;
  trend: number;
}

export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertTaxReportSchema = createInsertSchema(taxReports).omit({ id: true, createdAt: true });
export const insertGreenEntrySchema = createInsertSchema(greenEntries).omit({ id: true, createdAt: true });
export const insertEnvironmentalBalanceSchema = createInsertSchema(environmentalBalances).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export const insertClientInvitationSchema = createInsertSchema(clientInvitations).omit({ id: true, sentAt: true });

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;
export type InsertTaxReport = z.infer<typeof insertTaxReportSchema>;
export type TaxReport = typeof taxReports.$inferSelect;
export type GreenEntry = typeof greenEntries.$inferSelect;
export type InsertGreenEntry = z.infer<typeof insertGreenEntrySchema>;
export type EnvironmentalBalance = typeof environmentalBalances.$inferSelect;
export type InsertEnvironmentalBalance = z.infer<typeof insertEnvironmentalBalanceSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type ClientInvitation = typeof clientInvitations.$inferSelect;
export type InsertClientInvitation = z.infer<typeof insertClientInvitationSchema>;
