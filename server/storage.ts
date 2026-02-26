import { taxReports, companies, greenEntries, environmentalBalances, documents, clientInvitations, type Company, type TaxReport, type InsertCompany, type InsertTaxReport, type GreenEntry, type InsertGreenEntry, type EnvironmentalBalance, type InsertEnvironmentalBalance, type Document, type InsertDocument, type ClientInvitation, type InsertClientInvitation } from "@shared/schema";
import { db } from "./db";
import { eq, inArray } from "drizzle-orm";

export interface IStorage {
  getCompany(id: string): Promise<Company | undefined>;
  getCompanyByRut(rut: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  getAllCompanies(): Promise<Company[]>;
  getCompaniesByAuditor(auditorId: string): Promise<Company[]>;
  updateCompany(id: string, data: Partial<InsertCompany>): Promise<Company | undefined>;

  getReport(id: string): Promise<TaxReport | undefined>;
  getReportsByCompany(companyId: string): Promise<TaxReport[]>;
  createReport(report: InsertTaxReport): Promise<TaxReport>;
  getAllReports(): Promise<TaxReport[]>;

  getGreenEntries(companyId: string): Promise<GreenEntry[]>;
  getGreenEntriesByCompanyIds(companyIds: string[]): Promise<GreenEntry[]>;
  createGreenEntry(entry: InsertGreenEntry): Promise<GreenEntry>;

  getEnvironmentalBalances(companyId: string): Promise<EnvironmentalBalance[]>;
  getEnvironmentalBalancesByCompanyIds(companyIds: string[]): Promise<EnvironmentalBalance[]>;
  createEnvironmentalBalance(balance: InsertEnvironmentalBalance): Promise<EnvironmentalBalance>;

  getDocuments(companyId: string): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;

  createInvitation(invitation: InsertClientInvitation): Promise<ClientInvitation>;
  getInvitationByToken(token: string): Promise<ClientInvitation | undefined>;
  getInvitationById(id: string): Promise<ClientInvitation | undefined>;
  getInvitationsByAuditor(auditorId: string): Promise<ClientInvitation[]>;
  updateInvitation(id: string, data: Partial<ClientInvitation>): Promise<ClientInvitation | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCompanyByRut(rut: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.rut, rut));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }

  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  async getCompaniesByAuditor(auditorId: string): Promise<Company[]> {
    return await db.select().from(companies).where(eq(companies.assignedAuditorId, auditorId));
  }

  async updateCompany(id: string, data: Partial<InsertCompany>): Promise<Company | undefined> {
    const [updated] = await db.update(companies).set(data).where(eq(companies.id, id)).returning();
    return updated;
  }

  async getReport(id: string): Promise<TaxReport | undefined> {
    const [report] = await db.select().from(taxReports).where(eq(taxReports.id, id));
    return report;
  }

  async getReportsByCompany(companyId: string): Promise<TaxReport[]> {
    return await db.select().from(taxReports).where(eq(taxReports.companyId, companyId));
  }

  async createReport(report: InsertTaxReport): Promise<TaxReport> {
    const [created] = await db.insert(taxReports).values(report).returning();
    return created;
  }

  async getAllReports(): Promise<TaxReport[]> {
    return await db.select().from(taxReports);
  }

  async getGreenEntries(companyId: string): Promise<GreenEntry[]> {
    return await db.select().from(greenEntries).where(eq(greenEntries.companyId, companyId));
  }

  async getGreenEntriesByCompanyIds(companyIds: string[]): Promise<GreenEntry[]> {
    if (companyIds.length === 0) return [];
    return await db.select().from(greenEntries).where(inArray(greenEntries.companyId, companyIds));
  }

  async createGreenEntry(entry: InsertGreenEntry): Promise<GreenEntry> {
    const [created] = await db.insert(greenEntries).values(entry).returning();
    return created;
  }

  async getEnvironmentalBalances(companyId: string): Promise<EnvironmentalBalance[]> {
    return await db.select().from(environmentalBalances).where(eq(environmentalBalances.companyId, companyId));
  }

  async getEnvironmentalBalancesByCompanyIds(companyIds: string[]): Promise<EnvironmentalBalance[]> {
    if (companyIds.length === 0) return [];
    return await db.select().from(environmentalBalances).where(inArray(environmentalBalances.companyId, companyIds));
  }

  async createEnvironmentalBalance(balance: InsertEnvironmentalBalance): Promise<EnvironmentalBalance> {
    const [created] = await db.insert(environmentalBalances).values(balance).returning();
    return created;
  }

  async getDocuments(companyId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.companyId, companyId));
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(doc).returning();
    return created;
  }

  async createInvitation(invitation: InsertClientInvitation): Promise<ClientInvitation> {
    const [created] = await db.insert(clientInvitations).values(invitation).returning();
    return created;
  }

  async getInvitationByToken(token: string): Promise<ClientInvitation | undefined> {
    const [inv] = await db.select().from(clientInvitations).where(eq(clientInvitations.token, token));
    return inv;
  }

  async getInvitationById(id: string): Promise<ClientInvitation | undefined> {
    const [inv] = await db.select().from(clientInvitations).where(eq(clientInvitations.id, id));
    return inv;
  }

  async getInvitationsByAuditor(auditorId: string): Promise<ClientInvitation[]> {
    return await db.select().from(clientInvitations).where(eq(clientInvitations.invitedByUserId, auditorId));
  }

  async updateInvitation(id: string, data: Partial<ClientInvitation>): Promise<ClientInvitation | undefined> {
    const [updated] = await db.update(clientInvitations).set(data).where(eq(clientInvitations.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
