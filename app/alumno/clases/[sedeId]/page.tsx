import Link from "next/link";
import { notFound } from "next/navigation";
import { listarClasesParaAlumno, listarSedes } from "@/lib/alumno/clases-data";
import { InscripcionControl } from "../inscripcion-control";
import { SedeIcon } from "@/components/alumno/sede-icon";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronRightIcon, UserIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

// Los horarios son recurrentes semana a semana (todos los lunes son el mismo
// horario), así que el selector es por día de la semana, no por fecha de
// calendario -- no hay "próximo lunes 18" ni nada parecido, solo el nombre
// del día. Por default se abre en el día de hoy (Date#getDay() da 0=domingo,
// se convierte a la convención 1=lunes..7=domingo que ya usa el resto de la
// app -- ver lib/dias-semana.ts).
function diaDeHoyISO(): number {
  const js = new Date().getDay();
  return js === 0 ? 7 : js;
}

export default async function ClasesDeSedePage({
  params,
  searchParams,
}: {
  params: Promise<{ sedeId: string }>;
  searchParams: Promise<{ dia?: string }>;
}) {
  const { sedeId } = await params;
  const { dia: diaParam } = await searchParams;

  const [sedes, clases] = await Promise.all([listarSedes(), listarClasesParaAlumno()]);
  const sede = sedes.find((s) => s.id === sedeId);
  if (!sede) {
    notFound();
  }

  const clasesDeSede = clases.filter((c) => c.sedeId === sedeId);

  const diaParseado = Number(diaParam);
  const diaSeleccionado = DIAS_SEMANA.some((d) => d.value === diaParseado) ? diaParseado : diaDeHoyISO();

  const clasesDelDia = clasesDeSede
    .filter((c) => c.diaSemana === diaSeleccionado)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <div>
        <Link
          href="/alumno/clases"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver a clases
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-50 text-secondary-600">
            <SedeIcon nombre={sede.nombre} className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-bold uppercase tracking-wide text-neutral-900 sm:text-2xl">{sede.nombre}</h1>
        </div>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {DIAS_SEMANA.map((d) => {
          const activo = d.value === diaSeleccionado;
          return (
            <Link
              key={d.value}
              href={`/alumno/clases/${sedeId}?dia=${d.value}`}
              scroll={false}
              className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                activo
                  ? "border-primary-600 bg-primary-600 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-primary-300"
              }`}
            >
              {d.label.slice(0, 3)}
            </Link>
          );
        })}
      </div>

      {clasesDelDia.length === 0 ? (
        <EmptyState
          title="No hay horarios este día"
          description="Probá con otro día de la semana en el selector de arriba."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {clasesDelDia.map((c) => {
            const lleno = c.inscriptosActivos >= c.cupo;
            return (
              <Card key={c.id} className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 text-primary-300 ring-1 ring-black/5">
                    {c.profesorFotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL de Storage/estática dinámica.
                      <img src={c.profesorFotoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon className="h-6 w-6" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-neutral-900">
                      {c.horaInicio.slice(0, 5)} - {c.horaFin.slice(0, 5)}
                      {c.actividadNombre && (
                        <span className="ml-2 text-sm font-semibold uppercase tracking-wide text-secondary-600">
                          {c.actividadNombre}
                        </span>
                      )}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                      <span>Prof. {c.profesorNombre}</span>
                      <Badge variant={lleno ? "warning" : "neutral"}>
                        {c.inscriptosActivos}/{c.cupo} lugares
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <InscripcionControl claseId={c.id} miInscripcionId={c.miInscripcionId} miEstado={c.miEstado} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
