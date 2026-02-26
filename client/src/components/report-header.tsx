import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, Mail, MapPin, FileText, Shield, User } from "lucide-react";
import type { TaxReport } from "@shared/schema";

interface ReportHeaderProps {
  report: TaxReport;
}

export function ReportHeader({ report }: ReportHeaderProps) {
  const statusCount = getComplianceScore(report);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-br from-primary/90 to-primary p-6 text-primary-foreground">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              <h1 className="text-xl font-bold tracking-tight" data-testid="text-report-title">
                Boletín Tributario
              </h1>
            </div>
            <p className="text-primary-foreground/80 text-sm max-w-md">
              Reporte de cumplimiento generado a partir de fuentes oficiales del SII, TGR, Dirección del Trabajo y Previred
            </p>
          </div>
          <div className="text-right space-y-1">
            <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-xs" data-testid="badge-report-date">
              <Calendar className="mr-1 h-3 w-3" />
              {report.createdAt ? new Date(report.createdAt).toLocaleDateString("es-CL", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }) : "Sin fecha"}
            </Badge>
            <div className="flex items-center gap-1.5 justify-end mt-2">
              <User className="h-3 w-3 text-primary-foreground/70" />
              <span className="text-xs text-primary-foreground/70" data-testid="text-requested-by">{report.requestedBy}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ScoreCard label="Cumplimiento" value={`${statusCount.ok}/${statusCount.total}`} variant="positive" />
          <ScoreCard label="Alertas" value={String(statusCount.warnings)} variant={statusCount.warnings > 0 ? "warning" : "positive"} />
          <ScoreCard label="Problemas" value={String(statusCount.errors)} variant={statusCount.errors > 0 ? "negative" : "positive"} />
          <ScoreCard label="Sin Info" value={String(statusCount.neutral)} variant="neutral" />
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Antecedentes de la Empresa</p>
            <p className="text-sm font-semibold" data-testid="text-business-name">{report.businessName}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoItem
            icon={<FileText className="h-4 w-4" />}
            label="RUT"
            value={report.rut}
            testId="text-rut"
            mono
          />
          <InfoItem
            icon={<Mail className="h-4 w-4" />}
            label="Email Contacto"
            value={report.contactEmail || "N/A"}
            testId="text-contact-email"
          />
          <InfoItem
            icon={<MapPin className="h-4 w-4" />}
            label="Oficina Trámites"
            value={report.officeAddress || "N/A"}
            testId="text-office"
          />
          <InfoItem
            icon={<Building2 className="h-4 w-4" />}
            label="Segmento"
            value={report.segment || "N/A"}
            testId="text-segment"
          />
          <InfoItem
            icon={<Calendar className="h-4 w-4" />}
            label="Segmento desde"
            value={report.segmentFrom || "N/A"}
            testId="text-segment-from"
          />
          <InfoItem
            icon={<Building2 className="h-4 w-4" />}
            label="Tamaño Empresa"
            value={report.companySize || "N/A"}
            testId="text-company-size"
          />
        </div>
      </Card>
    </div>
  );
}

function ScoreCard({ label, value, variant }: { label: string; value: string; variant: "positive" | "warning" | "negative" | "neutral" }) {
  const bgMap = {
    positive: "bg-primary-foreground/15",
    warning: "bg-amber-400/20",
    negative: "bg-red-400/20",
    neutral: "bg-primary-foreground/10",
  };

  return (
    <div className={`rounded-lg p-3 ${bgMap[variant]}`}>
      <p className="text-[10px] uppercase tracking-wider text-primary-foreground/70 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-primary-foreground">{value}</p>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
  testId,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  testId: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium truncate ${mono ? "font-mono" : ""}`} data-testid={testId}>{value}</p>
      </div>
    </div>
  );
}

function getComplianceScore(report: TaxReport) {
  const fields = [
    report.fines,
    report.notifications,
    report.properties,
    report.propertyDebts,
    report.postponedIva,
    report.f29Declared,
    report.f29Observed,
    report.f22Observed,
    report.presumedDefaults,
    report.tgrDebts,
    report.tgrFiles,
    report.tgrAgreements,
    report.previredDnp,
    report.previredPayments,
    report.commercialBulletin,
    report.commercialBulletinUf,
  ];

  let ok = 0;
  let warnings = 0;
  let errors = 0;
  let neutral = 0;

  for (const f of fields) {
    const val = (f || "").toLowerCase();
    if (val.includes("sin multas") || val.includes("sin deudas") || val.includes("sin documentos") || val.includes("sin moras") || val.includes("sin expedientes") || val.includes("sin convenios") || val.includes("sin observaciones") || val.includes("sin propiedades") || val.includes("sin f29") || val.includes("sin ivas") || val.includes("sin ddjj")) {
      ok++;
    } else if (val.includes("sin información") || val === "n/a" || !val) {
      neutral++;
    } else if (val.includes("observ") || val.includes("pendiente")) {
      warnings++;
    } else {
      ok++;
    }
  }

  return { ok, warnings, errors, neutral, total: fields.length };
}
