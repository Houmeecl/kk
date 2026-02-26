import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import crypto from "crypto";
import { z } from "zod";
import * as apigateway from "./services/apigateway";
import { generarAsientosVerdes } from "./services/green-entries-generator";
import { analyticsAgent } from "./services/analytics-agent";
import { pdfExtractor } from "./services/pdf-extractor";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/companies", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id?.toString();
      if (userId) {
        const companies = await storage.getCompaniesByAuditor(userId);
        res.json(companies);
      } else {
        const companies = await storage.getAllCompanies();
        res.json(companies);
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching companies" });
    }
  });

  const createCompanySchema = z.object({
    rut: z.string().min(1),
    businessName: z.string().min(1),
    contactEmail: z.string().email().optional().nullable(),
  });

  app.post("/api/companies", isAuthenticated, async (req, res) => {
    try {
      const parsed = createCompanySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
      const userId = req.user?.id?.toString();
      const company = await storage.createCompany({
        ...parsed.data,
        assignedAuditorId: userId,
        invitationStatus: "pending",
        siiLinked: false,
      });
      res.status(201).json(company);
    } catch (error: any) {
      if (error?.message?.includes("unique")) {
        res.status(409).json({ message: "Ya existe una empresa con ese RUT" });
      } else {
        res.status(500).json({ message: "Error creating company" });
      }
    }
  });

  app.patch("/api/companies/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id?.toString();
      const existing = await storage.getCompany(req.params.id);
      if (!existing) return res.status(404).json({ message: "Company not found" });
      if (existing.assignedAuditorId && existing.assignedAuditorId !== userId) {
        return res.status(403).json({ message: "No autorizado para modificar esta empresa" });
      }
      const company = await storage.updateCompany(req.params.id, req.body);
      res.json(company);
    } catch (error) {
      res.status(500).json({ message: "Error updating company" });
    }
  });

  app.get("/api/reports", isAuthenticated, async (_req, res) => {
    try {
      const reports = await storage.getAllReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reports" });
    }
  });

  app.get("/api/reports/:id", isAuthenticated, async (req, res) => {
    try {
      const report = await storage.getReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Error fetching report" });
    }
  });

  app.post("/api/extract/esg-report", isAuthenticated, upload.single('report'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No se proporcionó ningún archivo PDF" });
      }

      const extracted = await pdfExtractor.extractFromBuffer(req.file.buffer);

      // Simple heuristic text analysis to simulate ESG/Carbon parsing
      // In production, this text would be passed to an LLM or specific Regex parser
      const text = extracted.text.toLowerCase();
      
      let estimatedScope1 = 0;
      let estimatedScope2 = 0;
      let estimatedScope3 = 0;
      
      const match1 = text.match(/alcance 1[^0-9]*([0-9,.]+)/);
      const match2 = text.match(/alcance 2[^0-9]*([0-9,.]+)/);
      const match3 = text.match(/alcance 3[^0-9]*([0-9,.]+)/);

      if (match1) estimatedScope1 = parseFloat(match1[1].replace(/,/g, ''));
      if (match2) estimatedScope2 = parseFloat(match2[1].replace(/,/g, ''));
      if (match3) estimatedScope3 = parseFloat(match3[1].replace(/,/g, ''));

      res.json({
        message: "PDF procesado correctamente",
        metadata: extracted.metadata,
        extractedData: {
          scope1Tco2e: estimatedScope1,
          scope2Tco2e: estimatedScope2,
          scope3Tco2e: estimatedScope3,
          totalTco2e: estimatedScope1 + estimatedScope2 + estimatedScope3,
          textSample: extracted.text.substring(0, 500) + "..."
        }
      });
    } catch (error) {
      console.error("PDF Extraction error:", error);
      res.status(500).json({ message: "Error procesando el archivo PDF", error: String(error) });
    }
  });

  app.get("/api/companies/:id/analytics", isAuthenticated, async (req, res) => {
    try {
      const report = await analyticsAgent.generateAnalyticsReport(req.params.id);
      res.json(report);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error generating analytics report" });
    }
  });

  app.get("/api/green-entries", isAuthenticated, async (req, res) => {
    try {
      const companyId = req.query.companyId as string;
      if (companyId) {
        const entries = await storage.getGreenEntries(companyId);
        return res.json(entries);
      }
      const userId = req.user?.id?.toString();
      if (!userId) return res.json([]);
      const userCompanies = await storage.getCompaniesByAuditor(userId);
      const companyIds = userCompanies.map(c => c.id);
      const companyNameById = Object.fromEntries(userCompanies.map(c => [c.id, c.businessName]));
      const entries = await storage.getGreenEntriesByCompanyIds(companyIds);
      res.json(entries.map(e => ({ ...e, companyName: companyNameById[e.companyId] })));
    } catch (error) {
      res.status(500).json({ message: "Error fetching green entries" });
    }
  });

  const createGreenEntrySchema = z.object({
    companyId: z.string().min(1),
    date: z.string().or(z.date()),
    period: z.string().min(1),
    category: z.string().min(1),
    subcategory: z.string().optional().nullable(),
    description: z.string().min(1),
    physicalQuantity: z.number().optional().nullable(),
    physicalUnit: z.string().optional().nullable(),
    monetaryValue: z.number().optional().nullable(),
    currency: z.string().default("CLP"),
    co2Equivalent: z.number().optional().nullable(),
    methodology: z.string().optional().nullable(),
    scope: z.string().optional().nullable(),
    odsAlignment: z.string().optional().nullable(),
    tmasClassification: z.string().optional().nullable(),
    supportDoc: z.string().optional().nullable(),
    status: z.string().default("pendiente"),
    createdBy: z.string().optional().nullable(),
    reviewedBy: z.string().optional().nullable(),
  });

  app.post("/api/green-entries", isAuthenticated, async (req, res) => {
    try {
      const parsed = createGreenEntrySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
      const entry = await storage.createGreenEntry({
        ...parsed.data,
        date: new Date(parsed.data.date),
      });
      res.status(201).json(entry);
    } catch (error) {
      res.status(500).json({ message: "Error creating green entry" });
    }
  });

  app.get("/api/environmental-balances", isAuthenticated, async (req, res) => {
    try {
      const companyId = req.query.companyId as string;
      if (companyId) {
        const balances = await storage.getEnvironmentalBalances(companyId);
        return res.json(balances);
      }
      const userId = req.user?.id?.toString();
      if (!userId) return res.json([]);
      const userCompanies = await storage.getCompaniesByAuditor(userId);
      const companyIds = userCompanies.map(c => c.id);
      const companyNameById = Object.fromEntries(userCompanies.map(c => [c.id, c.businessName]));
      const balances = await storage.getEnvironmentalBalancesByCompanyIds(companyIds);
      res.json(balances.map(b => ({ ...b, companyName: companyNameById[b.companyId] })));
    } catch (error) {
      res.status(500).json({ message: "Error fetching environmental balances" });
    }
  });

  app.post("/api/companies/:id/generate-green-entries", isAuthenticated, async (req, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) return res.status(404).json({ message: "Empresa no encontrada" });
      if (!company.siiLinked) return res.status(400).json({ message: "Empresa no tiene SII enlazado" });

      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const reports = await storage.getReportsByCompany(company.id);
      const companyReport = reports[0];

      let rcvComprasDetalle: any[] = [];
      let rcvVentasDetalle: any[] = [];
      if (companyReport?.integralConsultation) {
        for (const ic of companyReport.integralConsultation as any[]) {
          if (ic.values?.rcvComprasDetalle) {
            try { rcvComprasDetalle = JSON.parse(ic.values.rcvComprasDetalle); } catch {}
          }
          if (ic.values?.rcvVentasDetalle) {
            try { rcvVentasDetalle = JSON.parse(ic.values.rcvVentasDetalle); } catch {}
          }
        }
      }

      const extraccionReconstruida: apigateway.ExtraccionCompleta = {
        situacionTributaria: null,
        rcvComprasResumen: null,
        rcvVentasResumen: null,
        rcvComprasDetalle: rcvComprasDetalle.map((d: any) => ({
          dcv_folio: d.folio, dcv_tipo: d.tipo, dcv_rut: d.rut,
          dcv_razon_social: d.razonSocial, dcv_fecha_emision: d.fechaEmision,
          dcv_fecha_recepcion: d.fechaRecepcion, dcv_monto_neto: d.montoNeto,
          dcv_monto_exento: d.montoExento, dcv_monto_iva: d.montoIva,
          dcv_monto_total: d.montoTotal,
        })),
        rcvVentasDetalle: rcvVentasDetalle.map((d: any) => ({
          dcv_folio: d.folio, dcv_tipo: d.tipo, dcv_rut: d.rut,
          dcv_razon_social: d.razonSocial, dcv_fecha_emision: d.fechaEmision,
          dcv_fecha_recepcion: "", dcv_monto_neto: d.montoNeto,
          dcv_monto_exento: d.montoExento, dcv_monto_iva: d.montoIva,
          dcv_monto_total: d.montoTotal,
        })),
      };

      if (rcvComprasDetalle.length === 0 && rcvVentasDetalle.length === 0) {
        return res.status(400).json({ message: "No hay datos RCV almacenados para esta empresa. El cliente debe enlazar sus credenciales SII primero." });
      }

      const entries = generarAsientosVerdes(extraccionReconstruida, period);

      const created = [];
      for (const entry of entries) {
        const greenEntry = await storage.createGreenEntry({
          companyId: company.id,
          date: now,
          period,
          ...entry,
          currency: "CLP",
          supportDoc: null,
          status: "verificado",
          createdBy: req.user?.id?.toString(),
          reviewedBy: null,
        });
        created.push(greenEntry);
      }

      res.status(201).json({ message: `Se generaron ${created.length} asientos verdes`, entries: created });
    } catch (error) {
      res.status(500).json({ message: "Error generating green entries" });
    }
  });

  app.get("/api/sii/situacion-tributaria/:rut", isAuthenticated, async (req, res) => {
    try {
      const data = await apigateway.getSituacionTributaria(req.params.rut);
      res.json(data);
    } catch (error: any) {
      console.error("API Gateway error:", error.message);
      res.status(502).json({ message: "Error consultando SII", detail: error.message });
    }
  });

  app.post("/api/sii/rcv/compras", isAuthenticated, async (req, res) => {
    try {
      const { receptor, periodo, estado, rut, clave } = req.body;
      if (!receptor || !periodo || !rut || !clave) {
        return res.status(400).json({ message: "Faltan parámetros requeridos" });
      }
      const data = await apigateway.getRcvComprasResumen(receptor, periodo, estado || "REGISTRO", rut, clave);
      res.json(data);
    } catch (error: any) {
      console.error("API Gateway RCV error:", error.message);
      res.status(502).json({ message: "Error consultando RCV compras", detail: error.message });
    }
  });

  app.post("/api/sii/rcv/ventas", isAuthenticated, async (req, res) => {
    try {
      const { emisor, periodo, rut, clave } = req.body;
      if (!emisor || !periodo || !rut || !clave) {
        return res.status(400).json({ message: "Faltan parámetros requeridos" });
      }
      const data = await apigateway.getRcvVentasResumen(emisor, periodo, rut, clave);
      res.json(data);
    } catch (error: any) {
      console.error("API Gateway RCV error:", error.message);
      res.status(502).json({ message: "Error consultando RCV ventas", detail: error.message });
    }
  });

  app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const companyId = req.query.companyId as string;
      if (!companyId) return res.status(400).json({ message: "companyId es requerido" });
      const docs = await storage.getDocuments(companyId);
      res.json(docs);
    } catch (error) {
      res.status(500).json({ message: "Error fetching documents" });
    }
  });

  const createDocumentSchema = z.object({
    companyId: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    description: z.string().optional().nullable(),
  });

  app.post("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const parsed = createDocumentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
      const doc = await storage.createDocument({
        ...parsed.data,
        uploadedBy: req.user?.id?.toString(),
      });
      res.status(201).json(doc);
    } catch (error) {
      res.status(500).json({ message: "Error creating document" });
    }
  });

  app.get("/api/invitations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id?.toString();
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const invitations = await storage.getInvitationsByAuditor(userId);
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ message: "Error fetching invitations" });
    }
  });

  const createInvitationSchema = z.object({
    clientName: z.string().min(1, "Nombre es requerido"),
    clientEmail: z.string().email("Email inválido"),
    clientRut: z.string().optional(),
    companyId: z.string().optional(),
  });

  app.post("/api/invitations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id?.toString();
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const parsed = createInvitationSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });

      const { clientEmail, clientName, clientRut, companyId } = parsed.data;

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invitation = await storage.createInvitation({
        invitedByUserId: userId,
        clientEmail,
        clientName,
        clientRut: clientRut || null,
        companyId: companyId || null,
        token,
        status: "pending",
        acceptedAt: null,
        expiresAt,
      });

      res.status(201).json(invitation);
    } catch (error) {
      res.status(500).json({ message: "Error creating invitation" });
    }
  });

  app.post("/api/invitations/:id/resend", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id?.toString();
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const existing = await storage.getInvitationById(req.params.id);
      if (!existing || existing.invitedByUserId !== userId) return res.status(404).json({ message: "Invitación no encontrada" });

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const updated = await storage.updateInvitation(req.params.id, {
        token,
        expiresAt,
        status: "pending",
      });
      if (!updated) return res.status(404).json({ message: "Invitation not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Error resending invitation" });
    }
  });

  app.get("/api/onboarding/:token", async (req, res) => {
    try {
      const invitation = await storage.getInvitationByToken(req.params.token);
      if (!invitation) return res.status(404).json({ message: "Invitación no encontrada" });
      if (invitation.status === "accepted") return res.status(400).json({ message: "Invitación ya fue aceptada" });
      if (new Date() > invitation.expiresAt) return res.status(400).json({ message: "Invitación expirada" });
      res.json({
        clientName: invitation.clientName,
        clientEmail: invitation.clientEmail,
        clientRut: invitation.clientRut,
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching invitation" });
    }
  });

  const onboardingSchema = z.object({
    rut: z.string().min(1, "RUT es requerido"),
    businessName: z.string().optional(),
    contactEmail: z.string().email().optional(),
    siiUser: z.string().min(1, "Usuario SII es requerido"),
    siiPassword: z.string().min(1, "Clave SII es requerida"),
  });

  app.post("/api/onboarding/:token", async (req, res) => {
    try {
      const invitation = await storage.getInvitationByToken(req.params.token);
      if (!invitation) return res.status(404).json({ message: "Invitación no encontrada" });
      if (invitation.status === "accepted") return res.status(400).json({ message: "Invitación ya fue aceptada" });
      if (new Date() > invitation.expiresAt) return res.status(400).json({ message: "Invitación expirada" });

      const parsed = onboardingSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });

      const { rut, businessName, contactEmail, siiUser, siiPassword } = parsed.data;
      const cleanRut = apigateway.formatRut(rut);

      const now = new Date();
      const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const extraccion = await apigateway.extraerDatosCompletos(cleanRut, siiUser, siiPassword, periodo);
      const siiData = extraccion.situacionTributaria;

      let siiActivities: { name: string; code: string; category: string; affectsIva: boolean; from: string }[] = [];
      if (siiData?.actividades) {
        siiActivities = siiData.actividades.map(a => ({
          name: a.glosa,
          code: a.codigo,
          category: `Categoría ${a.categoria}`,
          affectsIva: a.afecta,
          from: siiData!.fecha_inicio_actividades || "",
        }));
      }

      const companyData: any = {
        rut: cleanRut,
        businessName: siiData?.razon_social || businessName || invitation.clientName,
        contactEmail: contactEmail || invitation.clientEmail,
        siiLinked: true,
        invitationStatus: "accepted",
        activities: siiActivities.length > 0 ? siiActivities : undefined,
        startDate: siiData?.fecha_inicio_actividades || undefined,
        taxRegime: siiData?.pro_pyme ? "Pro-PYME" : "General",
      };

      let company;
      if (invitation.companyId) {
        company = await storage.updateCompany(invitation.companyId, companyData);
      } else {
        company = await storage.createCompany({
          ...companyData,
          assignedAuditorId: invitation.invitedByUserId,
        });
      }

      if (company) {
        try {
          const incomeHistory: { year: number; amount: string }[] = [];
          if (extraccion.rcvVentasResumen?.resumen) {
            for (const item of extraccion.rcvVentasResumen.resumen) {
              incomeHistory.push({
                year: now.getFullYear(),
                amount: `$${(item.monto_total || 0).toLocaleString("es-CL")} CLP`,
              });
            }
          }

          const rcvComprasDetalle = extraccion.rcvComprasDetalle.map(d => ({
            folio: d.dcv_folio,
            tipo: d.dcv_tipo,
            tipoNombre: apigateway.DTE_TYPES[d.dcv_tipo] || `DTE ${d.dcv_tipo}`,
            rut: d.dcv_rut,
            razonSocial: d.dcv_razon_social,
            fechaEmision: d.dcv_fecha_emision,
            fechaRecepcion: d.dcv_fecha_recepcion,
            montoNeto: d.dcv_monto_neto,
            montoExento: d.dcv_monto_exento,
            montoIva: d.dcv_monto_iva,
            montoTotal: d.dcv_monto_total,
          }));

          const rcvVentasDetalle = extraccion.rcvVentasDetalle.map(d => ({
            folio: d.dcv_folio,
            tipo: d.dcv_tipo,
            tipoNombre: apigateway.DTE_TYPES[d.dcv_tipo] || `DTE ${d.dcv_tipo}`,
            rut: d.dcv_rut,
            razonSocial: d.dcv_razon_social,
            fechaEmision: d.dcv_fecha_emision,
            montoNeto: d.dcv_monto_neto,
            montoExento: d.dcv_monto_exento,
            montoIva: d.dcv_monto_iva,
            montoTotal: d.dcv_monto_total,
          }));

          await storage.createReport({
            companyId: company.id,
            requestedBy: invitation.clientName,
            requestedByEmail: invitation.clientEmail,
            incomeHistory: incomeHistory.length > 0 ? incomeHistory : undefined,
            complianceScore: siiData?.observaciones ?
              (Object.values(siiData.observaciones).some(v => v) ? 75 : 95) : 90,
            f29Declared: siiData?.obligacion_dte ? "Al día con DTE" : "Sin información",
            integralConsultation: [
              { month: periodo, values: {
                comprasDocumentos: String(extraccion.rcvComprasDetalle.length),
                ventasDocumentos: String(extraccion.rcvVentasDetalle.length),
                comprasNeto: String(extraccion.rcvComprasResumen?.resumen?.reduce((s, i) => s + i.monto_neto, 0) || 0),
                ventasNeto: String(extraccion.rcvVentasResumen?.resumen?.reduce((s, i) => s + i.monto_neto, 0) || 0),
                rcvComprasDetalle: JSON.stringify(rcvComprasDetalle),
                rcvVentasDetalle: JSON.stringify(rcvVentasDetalle),
              }},
            ],
          });
        } catch (err: any) {
          console.warn("Error creando reporte inicial:", err.message);
        }

        const greenEntryData = generarAsientosVerdes(extraccion, periodo);
        let greenEntriesCreated = 0;
        for (const entry of greenEntryData) {
          try {
            await storage.createGreenEntry({
              companyId: company.id,
              date: now,
              period: periodo,
              ...entry,
              currency: "CLP",
              supportDoc: null,
              status: "verificado",
              createdBy: invitation.invitedByUserId,
              reviewedBy: null,
            });
            greenEntriesCreated++;
          } catch (err: any) {
            console.warn("Error creando asiento verde:", err.message);
          }
        }
        console.log(`Onboarding ${cleanRut}: ${greenEntriesCreated} asientos verdes generados de ${greenEntryData.length}`);
      }

      await storage.updateInvitation(invitation.id, {
        status: "accepted",
        acceptedAt: new Date(),
        companyId: company?.id,
      });

      res.json({
        message: "Datos SII enlazados correctamente",
        company,
        extraccion: {
          razonSocial: siiData?.razon_social,
          actividades: siiData?.actividades?.length || 0,
          proPyme: siiData?.pro_pyme,
          inicioActividades: siiData?.inicio_actividades,
          fechaInicio: siiData?.fecha_inicio_actividades,
          comprasDocumentos: extraccion.rcvComprasDetalle.length,
          ventasDocumentos: extraccion.rcvVentasDetalle.length,
          comprasResumen: extraccion.rcvComprasResumen?.resumen?.length || 0,
          ventasResumen: extraccion.rcvVentasResumen?.resumen?.length || 0,
        },
      });
    } catch (error: any) {
      console.error("Onboarding error:", error.message);
      res.status(500).json({ message: "Error processing onboarding" });
    }
  });

  return httpServer;
}
