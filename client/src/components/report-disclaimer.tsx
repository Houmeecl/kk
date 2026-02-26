import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";

export function ReportDisclaimer() {
  return (
    <Card className="p-5 border-dashed">
      <div className="flex gap-3">
        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            El Informe se genera de acuerdo a consultas realizadas directamente en las fuentes de datos configuradas de la empresa,
            tales como <strong>SII</strong>, <strong>TGR</strong>, <strong>Municipalidades</strong>, <strong>Dirección del Trabajo</strong> y <strong>Previred</strong>, entre otras.
          </p>
          <p>
            La vigencia del informe es hasta la fecha y hora en que se realiza la consulta a las fuentes de origen de datos,
            por lo que esta información puede cambiar en la medida que los interesados regularicen o actualicen su situación
            de incumplimiento con las diferentes instituciones.
          </p>
        </div>
      </div>
    </Card>
  );
}
