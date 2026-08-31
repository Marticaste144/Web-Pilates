import { listarTurnosDisponibles, obtenerResumenRecuperaciones } from "@/lib/alumno/turnos-data";
import { TomarTurnoButton } from "./tomar-turno-button";
import { SedeIcon } from "@/components/alumno/sede-icon";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { formatearDiaMes } from "@/lib/fecha";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

function diaLabel(dia: number): string {
  return DIAS_SEMANA.find((d) => d.value === dia)?.label ?? String(dia);
}

export default async function RecuperarPage() {
  const [turnos, resumen] = await Promise.all([listarTurnosDisponibles(), obtenerResumenRecuperaciones()]);

  const agotado = resumen.usadasEsteMes >= resumen.maxPorMes;

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <PageHeader
        title="Recuperar clase"
        subtitle="Turnos que otras alumnas de tu sede liberaron -- tomá uno hasta 1 hora antes de que empiece."
      />

      <Card className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">Recuperaciones usadas este mes</p>
          <p className="text-2xl font-bold text-neutral-900">
            {resumen.usadasEsteMes} / {resumen.maxPorMes}
          </p>
        </div>
        {agotado && <Badge variant="warning">Alcanzaste el máximo de este mes</Badge>}
      </Card>

      {turnos.length === 0 ? (
        <EmptyState
          title="No hay turnos liberados por ahora"
          description="Cuando una alumna de tu sede libere su lugar en una clase, va a aparecer acá."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {turnos.map((t) => (
            <Card key={t.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary-50 text-secondary-600">
                  <SedeIcon nombre={t.sedeNombre} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900">
                    {t.sedeNombre} · {diaLabel(t.diaSemana)} {formatearDiaMes(t.fecha)}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {t.horaInicio.slice(0, 5)} - {t.horaFin.slice(0, 5)} · Prof. {t.profesorNombre}
                  </p>
                </div>
              </div>
              <div className="shrink-0">{!agotado && <TomarTurnoButton turnoId={t.id} />}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
