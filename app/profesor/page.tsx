import Link from "next/link";
import Image from "next/image";
import { getCurrentProfile } from "@/lib/auth/session";
import { obtenerResumenDiaProfesor } from "@/lib/profesor/dashboard-data";
import { hoyISO, formatearFechaLarga } from "@/lib/fecha";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { OccupancyRing } from "@/components/profesor/occupancy-ring";
import { StatCard } from "@/components/profesor/stat-card";
import { CalendarIcon, UsersIcon, PieChartIcon, CheckIcon, ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function ProfesorHomePage() {
  const [profile, resumen] = await Promise.all([getCurrentProfile(), obtenerResumenDiaProfesor()]);
  const { clasesHoy, proximaClase, alumnasTotal, ocupacionPromedio, asistenciasHoy } = resumen;

  const hayClases = clasesHoy.length > 0 || proximaClase !== null;
  const fechaHoyLarga = formatearFechaLarga(hoyISO());

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">¡Hola, {profile?.nombre ?? ""}! 👋</h1>
        <p className="mt-1 text-sm text-neutral-500">Este es tu resumen de hoy, {fechaHoyLarga}.</p>
      </div>

      {!hayClases ? (
        <EmptyState
          title="Todavía no tenés clases asignadas"
          description="Cuando la administración te asigne una clase, la vas a ver acá."
        />
      ) : (
        <>
          {proximaClase && (
            // La imagen es el fondo de TODA la card (no un recuadro adentro
            // de la card) -- /public/img2.png ya trae el celeste, la onda y
            // la chica de Pilates armados, así que va como capa absoluta
            // detrás del contenido (relative z-10), con object-cover para
            // que nunca se deforme. La proporción de la card se ancla cerca
            // del aspect ratio real del archivo (~16:9) para que el
            // recorte de object-cover sea siempre horizontal (le come el
            // celeste vacío de la izquierda si hace falta), nunca vertical
            // (así la figura entra completa de la cabeza a los pies).
            <div className="relative overflow-hidden rounded-card shadow-sm">
              <Image
                src="/img2.png"
                alt=""
                aria-hidden
                fill
                priority
                sizes="(min-width: 1024px) 1100px, 100vw"
                className="object-cover object-[62%_center]"
              />

              <div className="relative z-10 flex min-h-[300px] flex-col justify-between gap-6 p-5 sm:aspect-video sm:min-h-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-8 lg:p-10">
                <div className="max-w-[200px] sm:max-w-[220px] lg:max-w-xs">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Próxima clase</p>
                  <h2 className="mt-2 text-2xl font-bold text-neutral-900 sm:text-3xl">
                    {proximaClase.horaInicio.slice(0, 5)} - {proximaClase.horaFin.slice(0, 5)}
                  </h2>
                  <p className="mt-1 text-lg font-semibold text-secondary-700">{proximaClase.sedeNombre}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-neutral-700">
                    <UsersIcon className="h-4 w-4" />
                    {proximaClase.inscriptosActivos} de {proximaClase.cupo} alumnas
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-between sm:gap-6 sm:self-stretch sm:py-1">
                  <OccupancyRing value={proximaClase.inscriptosActivos} max={proximaClase.cupo} />
                  <Link
                    href={`/profesor/clases/${proximaClase.id}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
                  >
                    Tomar asistencia
                    <ChevronRightIcon className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={CalendarIcon} label="Clases hoy" value={String(clasesHoy.length)} />
            <StatCard icon={UsersIcon} label="Alumnas totales" value={String(alumnasTotal)} />
            <StatCard icon={PieChartIcon} label="Ocupación promedio" value={`${ocupacionPromedio}%`} />
            <StatCard icon={CheckIcon} label="Asistencias hoy" value={String(asistenciasHoy)} />
          </div>

          <Card padded={false}>
            <h2 className="p-5 pb-0 font-semibold text-neutral-900 sm:p-6 sm:pb-0">Mis clases de hoy</h2>

            {clasesHoy.length === 0 ? (
              <p className="p-5 pt-3 text-sm text-neutral-500 sm:p-6 sm:pt-3">No tenés clases hoy.</p>
            ) : (
              <>
                {/* Desktop/tablet: filas tipo tabla, sin scroll horizontal --
                    columnas fijas, nunca se angostan por debajo de lo legible. */}
                <div className="hidden sm:block">
                  <div className="grid grid-cols-[1fr_1fr_auto_1fr_auto] gap-4 px-6 pt-5 pb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
                    <span>Horario</span>
                    <span>Sede</span>
                    <span>Alumnas</span>
                    <span>Ocupación</span>
                    <span className="text-right">Acción</span>
                  </div>
                  <div className="flex flex-col divide-y divide-neutral-100 border-t border-neutral-100">
                    {clasesHoy.map((c) => {
                      const pct = c.cupo > 0 ? Math.round((c.inscriptosActivos / c.cupo) * 100) : 0;
                      return (
                        <Link
                          key={c.id}
                          href={`/profesor/clases/${c.id}`}
                          className="group grid grid-cols-[1fr_1fr_auto_1fr_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-neutral-50"
                        >
                          <span className="font-semibold text-neutral-900">
                            {c.horaInicio.slice(0, 5)} - {c.horaFin.slice(0, 5)}
                          </span>
                          <span className="min-w-0 truncate text-neutral-600">{c.sedeNombre}</span>
                          <span className="whitespace-nowrap text-neutral-600">
                            {c.inscriptosActivos}/{c.cupo}
                          </span>
                          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100">
                            <span className="block h-full rounded-full bg-secondary-500" style={{ width: `${pct}%` }} />
                          </span>
                          <span className="flex items-center justify-end gap-1.5 whitespace-nowrap text-sm font-medium text-primary-700">
                            <span className="rounded-lg bg-primary-50 px-3 py-1.5 transition-colors group-hover:bg-primary-100">
                              Tomar asistencia
                            </span>
                            <ChevronRightIcon className="h-4 w-4 text-neutral-300 group-hover:text-primary-500" />
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile: una card por clase -- toda la info visible sin
                    achicar texto ni forzar scroll horizontal. */}
                <div className="flex flex-col divide-y divide-neutral-100 border-t border-neutral-100 sm:hidden">
                  {clasesHoy.map((c) => {
                    const pct = c.cupo > 0 ? Math.round((c.inscriptosActivos / c.cupo) * 100) : 0;
                    return (
                      <Link key={c.id} href={`/profesor/clases/${c.id}`} className="flex flex-col gap-3 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-neutral-900">
                              {c.horaInicio.slice(0, 5)} - {c.horaFin.slice(0, 5)}
                            </p>
                            <p className="mt-0.5 text-sm text-neutral-500">{c.sedeNombre}</p>
                          </div>
                          <span className="shrink-0 text-sm text-neutral-500">
                            {c.inscriptosActivos}/{c.cupo}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                          <div className="h-full rounded-full bg-secondary-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-50 py-3 text-sm font-semibold text-primary-700">
                          Tomar asistencia
                          <ChevronRightIcon className="h-4 w-4" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
