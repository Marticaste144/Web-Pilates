import Link from "next/link";
import Image from "next/image";
import { getCurrentProfile } from "@/lib/auth/session";
import { listarMisClases } from "@/lib/profesor/clases-data";
import { calcularProximaOcurrencia } from "@/lib/proxima-ocurrencia";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { OccupancyRing } from "@/components/profesor/occupancy-ring";
import { StatCard } from "@/components/profesor/stat-card";
import { CalendarIcon, UsersIcon, PieChartIcon, ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

function diaLabel(dia: number) {
  return DIAS_SEMANA.find((d) => d.value === dia)?.label ?? String(dia);
}

// Mismo criterio de "día de hoy" (1=lunes..7=domingo, getDay() local) que usa
// calcularProximaOcurrencia (lib/proxima-ocurrencia.ts) -- así "próxima
// clase" y "clases de hoy" coinciden sobre qué día es hoy.
function diaSemanaActual(ahora: Date = new Date()) {
  return ahora.getDay() === 0 ? 7 : ahora.getDay();
}

export default async function ProfesorHomePage() {
  const [profile, clases] = await Promise.all([getCurrentProfile(), listarMisClases()]);
  const diaHoy = diaSemanaActual();

  const clasesHoy = clases
    .filter((c) => c.diaSemana === diaHoy)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  const proximaClase = calcularProximaOcurrencia(clases);

  const alumnosHoy = clasesHoy.reduce((sum, c) => sum + c.inscriptosActivos, 0);
  const clasesParaPromedio = clasesHoy.length > 0 ? clasesHoy : clases;
  const ocupacionPromedio =
    clasesParaPromedio.length > 0
      ? Math.round(
          (clasesParaPromedio.reduce((sum, c) => sum + (c.cupo > 0 ? c.inscriptosActivos / c.cupo : 0), 0) /
            clasesParaPromedio.length) *
            100,
        )
      : null;

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">¡Hola, {profile?.nombre ?? ""}! 👋</h1>
        <p className="mt-1 text-sm text-neutral-500">Este es tu resumen de hoy</p>
      </div>

      {clases.length === 0 ? (
        <EmptyState
          title="Todavía no tenés clases asignadas"
          description="Cuando la administración te asigne una clase, la vas a ver acá."
        />
      ) : (
        <>
          {proximaClase && (
            <div className="relative overflow-hidden rounded-card border border-neutral-200 bg-primary-50 shadow-sm">
              <div className="pointer-events-none absolute inset-0">
                <Image
                  src="/imgpilates.png"
                  alt=""
                  aria-hidden
                  fill
                  sizes="(min-width: 640px) 600px, 100vw"
                  className="object-cover object-right opacity-10"
                />
              </div>

              <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Próxima clase</p>
                  <h2 className="mt-2 text-2xl font-bold text-neutral-900 sm:text-3xl">
                    {diaLabel(proximaClase.diaSemana)} {proximaClase.horaInicio.slice(0, 5)} -{" "}
                    {proximaClase.horaFin.slice(0, 5)}
                  </h2>
                  <p className="mt-1 text-lg font-semibold text-secondary-600">{proximaClase.sedeNombre}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-neutral-500">
                    <UsersIcon className="h-4 w-4" />
                    {proximaClase.inscriptosActivos} de {proximaClase.cupo} alumnos
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-5 sm:gap-8">
                  <OccupancyRing value={proximaClase.inscriptosActivos} max={proximaClase.cupo} />
                  <Link
                    href={`/profesor/clases/${proximaClase.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
                  >
                    Ver clase
                    <ChevronRightIcon className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={CalendarIcon} label="Clases hoy" value={String(clasesHoy.length)} />
            <StatCard icon={UsersIcon} label="Alumnos hoy" value={String(alumnosHoy)} />
            <StatCard
              icon={PieChartIcon}
              label="Ocupación promedio"
              value={ocupacionPromedio !== null ? `${ocupacionPromedio}%` : "—"}
            />
          </div>

          <Card>
            <h2 className="font-semibold text-neutral-900">Tus clases de hoy</h2>

            {clasesHoy.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No tenés clases hoy.</p>
            ) : (
              <div className="mt-4 flex flex-col divide-y divide-neutral-100">
                {clasesHoy.map((c) => {
                  const pct = c.cupo > 0 ? Math.round((c.inscriptosActivos / c.cupo) * 100) : 0;
                  return (
                    <Link
                      key={c.id}
                      href={`/profesor/clases/${c.id}`}
                      className="group flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900">
                          {c.horaInicio.slice(0, 5)} - {c.horaFin.slice(0, 5)}
                        </p>
                        <p className="mt-0.5 text-sm text-neutral-500">{c.sedeNombre}</p>
                      </div>

                      <div className="flex items-center gap-4 sm:w-72 sm:shrink-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-neutral-500">
                            {c.inscriptosActivos}/{c.cupo} alumnos
                          </p>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                            <div
                              className="h-full rounded-full bg-secondary-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 transition-colors group-hover:bg-primary-100">
                          Tomar asistencia
                        </span>
                        <ChevronRightIcon className="hidden h-4 w-4 shrink-0 text-neutral-300 group-hover:text-primary-500 sm:block" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
