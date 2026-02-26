import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  FileWarning,
  Receipt,
  Home,
  CreditCard,
  Clock,
  FileCheck,
  Eye,
  ScrollText,
  Scale,
  Banknote,
  FolderOpen,
  Handshake,
  Users,
  Wallet,
  FileX,
  type LucideIcon,
} from "lucide-react";
import type { TaxReport, IntegralRow, F50Record, SwornDeclaration } from "@shared/schema";

interface SiiStatusSectionsProps {
  report: TaxReport;
}

type StatusLevel = "ok" | "warning" | "error" | "neutral";

function StatusDot({ level }: { level: StatusLevel }) {
  const colorMap = {
    ok: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
    neutral: "bg-muted-foreground/40",
  };
  return <div className={`w-2 h-2 rounded-full ${colorMap[level]} flex-shrink-0`} />;
}

function StatusIconLg({ level }: { level: StatusLevel }) {
  switch (level) {
    case "ok":
      return <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
    case "error":
      return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
    default:
      return <MinusCircle className="h-5 w-5 text-muted-foreground" />;
  }
}

function getStatusLevel(value: string | null | undefined): StatusLevel {
  if (!value) return "neutral";
  const lower = value.toLowerCase();
  if (lower.includes("sin multas") || lower.includes("sin deudas") || lower.includes("sin documentos") || lower.includes("sin moras") || lower.includes("sin expedientes") || lower.includes("sin convenios") || lower.includes("sin observaciones") || lower.includes("sin propiedades") || lower.includes("sin f29") || lower.includes("sin ivas") || lower.includes("sin ddjj")) return "ok";
  if (lower.includes("sin información")) return "neutral";
  if (lower.includes("observ") || lower.includes("pendiente") || lower.includes("sin declarar")) return "warning";
  if (lower.includes("multa") || lower.includes("deuda") || lower.includes("mora")) return "error";
  return "ok";
}

function getStatusBg(level: StatusLevel): string {
  const map = {
    ok: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40",
    warning: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40",
    error: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40",
    neutral: "bg-muted/30 border-border",
  };
  return map[level];
}

interface StatusItemData {
  icon: LucideIcon;
  title: string;
  value: string;
  source: string;
  testId: string;
}

function StatusRow({ item }: { item: StatusItemData }) {
  const level = getStatusLevel(item.value);
  const Icon = item.icon;

  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 ${getStatusBg(level)}`}>
      <StatusDot level={level} />
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium" data-testid={item.testId}>{item.title}</span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">{item.source}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{item.value}</p>
      </div>
      <StatusIconLg level={level} />
    </div>
  );
}

export function SiiStatusSections({ report }: SiiStatusSectionsProps) {
  const integralRows = (report.integralConsultation || []) as IntegralRow[];
  const f50Records = (report.f50Declared || []) as F50Record[];
  const swornDecls = (report.swornDeclarations || []) as SwornDeclaration[];

  const siiItems: StatusItemData[] = [
    { icon: FileWarning, title: "Multas", value: report.fines || "Sin Multas", source: "SII", testId: "text-fines" },
    { icon: Eye, title: "Notificaciones (Anotaciones Vigentes)", value: report.notifications || "Sin Información", source: "SII", testId: "text-notifications" },
    { icon: Home, title: "Propiedades", value: report.properties || "Sin Propiedades asociadas en SII", source: "SII", testId: "text-properties" },
    { icon: CreditCard, title: "Deudas (Propiedades)", value: report.propertyDebts || "Sin Deudas", source: "SII", testId: "text-property-debts" },
    { icon: Clock, title: "IVAs Postergados", value: report.postponedIva || "Sin IVAs Postergados", source: "SII", testId: "text-postponed-iva" },
    { icon: Receipt, title: "Formulario 29 Declarados", value: report.f29Declared || "Sin F29 sin declarar", source: "SII", testId: "text-f29-declared" },
    { icon: FileCheck, title: "Formulario 29 Observados", value: report.f29Observed || "Sin F29 Observados", source: "SII", testId: "text-f29-observed" },
    { icon: FileCheck, title: "Formulario 22 Observados", value: report.f22Observed || "Sin observaciones en F22", source: "SII", testId: "text-f22-observed" },
  ];

  const otherItems: StatusItemData[] = [
    { icon: Users, title: "Moras Presuntas", value: report.presumedDefaults || "Sin Moras Presuntas", source: "DT", testId: "text-presumed-defaults" },
    { icon: Banknote, title: "Deudas Fiscales", value: report.tgrDebts || "Sin Deudas", source: "TGR", testId: "text-tgr-debts" },
    { icon: FolderOpen, title: "Expedientes", value: report.tgrFiles || "Sin Expedientes", source: "TGR", testId: "text-tgr-files" },
    { icon: Handshake, title: "Convenios Vigentes", value: report.tgrAgreements || "Sin Convenios Vigentes", source: "TGR", testId: "text-tgr-agreements" },
    { icon: Users, title: "DNPs Pendientes", value: report.previredDnp || "Sin Información", source: "Previred", testId: "text-previred-dnp" },
    { icon: Wallet, title: "Pagos", value: report.previredPayments || "Sin Información", source: "Previred", testId: "text-previred-payments" },
    { icon: FileX, title: "Documentos Impagos", value: report.commercialBulletin || "Sin Documentos Impagos", source: "CCS", testId: "text-commercial-bulletin" },
    { icon: FileX, title: "Documentos Impagos (UF)", value: report.commercialBulletinUf || "Sin Documentos Impagos en UF", source: "CCS", testId: "text-commercial-bulletin-uf" },
  ];

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={["sii", "other", "integral", "f50", "sworn"]} className="space-y-3">
        <AccordionItem value="sii" className="border-0">
          <Card className="overflow-hidden">
            <AccordionTrigger className="px-5 py-4 hover:no-underline" data-testid="accordion-sii">
              <div className="flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Estado SII</span>
                <Badge variant="secondary" className="text-[10px] ml-1">{siiItems.length} items</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-0">
              <div className="grid grid-cols-1 gap-2">
                {siiItems.map((item, i) => (
                  <StatusRow key={i} item={item} />
                ))}
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {integralRows.length > 0 && (
          <AccordionItem value="integral" className="border-0">
            <Card className="overflow-hidden">
              <AccordionTrigger className="px-5 py-4 hover:no-underline" data-testid="accordion-integral">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Consulta Integral</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-0 pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sticky left-0 bg-card z-10 min-w-[90px]">Mes</TableHead>
                        {Object.keys(integralRows[0]?.values || {}).map((year) => (
                          <TableHead key={year} className="text-xs text-center min-w-[60px]">{year}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {integralRows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium sticky left-0 bg-card z-10">{row.month}</TableCell>
                          {Object.entries(row.values).map(([year, val]) => (
                            <TableCell key={year} className="text-xs text-center p-1.5">
                              <IntegralBadge value={val} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
        )}

        {f50Records.length > 0 && (
          <AccordionItem value="f50" className="border-0">
            <Card className="overflow-hidden">
              <AccordionTrigger className="px-5 py-4 hover:no-underline" data-testid="accordion-f50">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Formulario 50</span>
                  {report.f50Status && <Badge variant="secondary" className="text-[10px]">{report.f50Status}</Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-0 pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Año</TableHead>
                        <TableHead className="text-xs">Mes</TableHead>
                        <TableHead className="text-xs">Folio</TableHead>
                        <TableHead className="text-xs">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {f50Records.map((rec, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{rec.year}</TableCell>
                          <TableCell className="text-xs">{rec.month}</TableCell>
                          <TableCell className="text-xs font-mono">{rec.folio || "-"}</TableCell>
                          <TableCell className="text-xs">{rec.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
        )}

        {swornDecls.length > 0 && (
          <AccordionItem value="sworn" className="border-0">
            <Card className="overflow-hidden">
              <AccordionTrigger className="px-5 py-4 hover:no-underline" data-testid="accordion-sworn">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Declaraciones Juradas</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-0">
                <div className="space-y-2">
                  {swornDecls.map((decl, i) => {
                    const level = getStatusLevel(decl.status);
                    return (
                      <div key={i} className={`flex items-center gap-3 rounded-lg border p-3 ${getStatusBg(level)}`}>
                        <StatusDot level={level} />
                        <span className="text-sm font-medium" data-testid={`text-sworn-${decl.year}`}>{decl.year}</span>
                        <span className="text-xs text-muted-foreground">{decl.status}</span>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
        )}

        <AccordionItem value="other" className="border-0">
          <Card className="overflow-hidden">
            <AccordionTrigger className="px-5 py-4 hover:no-underline" data-testid="accordion-other">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Otras Instituciones</span>
                <Badge variant="secondary" className="text-[10px] ml-1">DT / TGR / Previred / CCS</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-0">
              <div className="grid grid-cols-1 gap-2">
                {otherItems.map((item, i) => (
                  <StatusRow key={i} item={item} />
                ))}
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function IntegralBadge({ value }: { value: string }) {
  let className = "text-[10px] font-mono min-w-[2.5rem] justify-center ";
  if (value === "S/O") className += "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30";
  else if (value === "S/D") className += "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/30";
  else className += "bg-muted/50 text-muted-foreground";

  return (
    <Badge variant="outline" className={className}>
      {value}
    </Badge>
  );
}
