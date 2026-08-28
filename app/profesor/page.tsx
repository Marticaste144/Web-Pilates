import Link from "next/link";
import Image from "next/image";
import { getCurrentProfile } from "@/lib/auth/session";
import { obtenerResumenDiaProfesor } from "@/lib/profesor/dashboard-data";
import { hoyISO, formatearFechaLarga } from "@/lib/fecha";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { OccupancyRing } from "@/components/ui/occupancy-ring";
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
            // Card compacta tipo banner (no un hero de página completa): la
            // altura la fija la card (h-[…], nunca aspect-ratio contra el
            // ancho), y la imagen se adapta a esa altura -- no al revés.
            //
            // Mobile: /public/img2.png como fondo a pantalla completa de la
            // card (fill + object-cover) -- técnica ya probada, se deja tal
            // cual.
            //
            // sm+: técnica distinta a propósito. Acá la card es mucho más
            // ancha que alta, así que object-cover recortaría más de la
            // mitad de la chica verticalmente. En cambio, la imagen mantiene
            // su intrinsic width/height (sin fill) y se le fuerza
            // h-full/w-auto: nunca se deforma ni se recorta la figura en sí,
            // solo se la ancla arriba a la derecha y el sobrante de ancho
            // (el celeste vacío de la izquierda de la imagen original) queda
            // recortado por el overflow-hidden de la card -- el bg-primary-50
            // de la card es del mismo celeste pálido que el fondo de la
            // imagen, así no se nota dónde termina una y empieza la otra.
            <div className="relative overflow-hidden rounded-card bg-primary-50 shadow-sm">
              <Image
                src="/img2.png"
                alt=""
                aria-hidden
                fill
                priority
                sizes="100vw"
                className="object-cover object-[62%_center] sm:hidden"
              />
              <Image
                src="/img2.png"
                alt=""
                aria-hidden
                width={1691}
                height={930}
                priority
                className="pointer-events-none absolute right-0 top-0 hidden h-full w-auto sm:block"
              />

              <div className="relative z-10 flex h-[240px] flex-col justify-between gap-4 p-5 sm:h-64 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-7 lg:h-72 lg:p-8">
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
