import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, Briefcase, Landmark, TrendingUp } from "lucide-react";
import type { TaxReport, Address, EconomicActivity, IncomeRecord } from "@shared/schema";

interface CompanyDetailsProps {
  report: TaxReport;
}

export function CompanyDetails({ report }: CompanyDetailsProps) {
  const addresses = (report.addresses || []) as Address[];
  const activities = (report.activities || []) as EconomicActivity[];
  const incomeHistory = (report.incomeHistory || []) as IncomeRecord[];

  return (
    <Tabs defaultValue="general" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4 h-auto" data-testid="tabs-company-details">
        <TabsTrigger value="general" className="text-xs py-2" data-testid="tab-general">
          <Landmark className="h-3.5 w-3.5 mr-1.5" />
          General
        </TabsTrigger>
        <TabsTrigger value="addresses" className="text-xs py-2" data-testid="tab-addresses">
          <MapPin className="h-3.5 w-3.5 mr-1.5" />
          Direcciones
        </TabsTrigger>
        <TabsTrigger value="activities" className="text-xs py-2" data-testid="tab-activities">
          <Briefcase className="h-3.5 w-3.5 mr-1.5" />
          Actividades
        </TabsTrigger>
        <TabsTrigger value="income" className="text-xs py-2" data-testid="tab-income">
          <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
          Ingresos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4">
        <Card className="p-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Fechas Importantes</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <DateCard
              icon={<Calendar className="h-4 w-4 text-primary" />}
              label="Constitución"
              value={report.constitutionDate || "NO"}
            />
            <DateCard
              icon={<Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              label="Inicio de Actividades"
              value={report.startDate || "N/A"}
            />
            <DateCard
              icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
              label="Término de Giro"
              value={report.endDate || "NO"}
            />
          </div>
        </Card>

        <Card className="p-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Régimen Tributario</h4>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="default" className="text-xs px-3 py-1" data-testid="badge-tax-regime">
              {report.taxRegime || "N/A"}
            </Badge>
            <span className="text-xs text-muted-foreground">desde {report.taxRegimeFrom || "N/A"}</span>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="addresses">
        <Card className="overflow-hidden">
          {addresses.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Código</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Dirección</TableHead>
                    <TableHead className="text-xs">Desde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addresses.map((addr, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-mono" data-testid={`text-addr-code-${i}`}>{addr.code}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{addr.type}</Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-sm">{addr.address}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{addr.from}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState text="Sin direcciones registradas" />
          )}
        </Card>
      </TabsContent>

      <TabsContent value="activities">
        <Card className="overflow-hidden">
          {activities.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Actividad</TableHead>
                    <TableHead className="text-xs">Código</TableHead>
                    <TableHead className="text-xs text-center">Cat.</TableHead>
                    <TableHead className="text-xs text-center">IVA</TableHead>
                    <TableHead className="text-xs">Desde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((act, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs max-w-xs" data-testid={`text-activity-name-${i}`}>{act.name}</TableCell>
                      <TableCell className="text-xs font-mono">{act.code}</TableCell>
                      <TableCell className="text-xs text-center">{act.category}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={act.affectsIva ? "default" : "secondary"} className="text-[10px]">
                          {act.affectsIva ? "SÍ" : "NO"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{act.from}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState text="Sin actividades económicas registradas" />
          )}
        </Card>
      </TabsContent>

      <TabsContent value="income">
        <Card className="p-5">
          {incomeHistory.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {incomeHistory.map((inc, i) => (
                <div key={i} className="rounded-lg border p-4 text-center space-y-1">
                  <p className="text-xs text-muted-foreground">Ingreso {inc.year}</p>
                  <p className="text-xl font-bold text-primary" data-testid={`text-income-${inc.year}`}>
                    {inc.amount}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Sin historial de ingresos disponible" />
          )}
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function DateCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-8 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
