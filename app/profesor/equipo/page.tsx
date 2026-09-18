import Link from "next/link";
import { listarEquipoPorSede } from "@/lib/profesor/equipo-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { SedeIcon } from "@/components/alumno/sede-icon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

function diaLabel(dia: number): string {
  return DIAS_SEMANA.find((d) => d.value === dia)?.label ?? String(dia);
}

// CORRECCIÓN (auditoría general): reescrita para mostrar a TODOS los
// profesores reales (con cuenta o todavía pendientes -- ver
// lib/profesor/equipo-data.ts), organizados SEDE -> ACTIVIDAD -> PROFESOR
// -> días/horarios. Antes solo mostraba profesores con cuenta de acceso ya
// creada (2-3 personas) por descartar de raíz cualquier clase con
// profesor_pendiente_nombre. <details>/<summary> nativo para expandir cada
// profesor (sin JS propio, accesible con teclado por defecto) -- pensado
// para reemplazos/suplencias: acá se ve rápido quién da qué, dónde y
// cuándo, sin depender de que tenga planificación cargada.
export default async function EquipoPage() {
  const sedes = await listarEquipoPorSede();
  const hayContenido = sedes.some((s) => s.actividades.length > 0);

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">Equipo</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Todos los profesores reales por sede y actividad, con sus días y horarios -- útil si tenés que reemplazar a
          alguien.
        </p>
      </div>

      {!hayContenido ? (
        <EmptyState title="Todavía no hay clases activas cargadas" />
      ) : (
        <div className="flex flex-col gap-4">
          {sedes.map((s) => (
            <Card key={s.sedeId} padded={false}>
              <div className="flex items-center gap-2.5 border-b border-neutral-100 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary-50 text-secondary-600">
                  <SedeIcon nombre={s.sedeNombre} className="h-4.5 w-4.5" />
                </span>
                <h2 className="font-semibold uppercase tracking-wide text-neutral-900">{s.sedeNombre}</h2>
              </div>

              {s.actividades.length === 0 ? (
                <p className="p-4 text-sm text-neutral-500">Todavía no hay profesores asignados en esta sede.</p>
              ) : (
                <div className="flex flex-col divide-y divide-neutral-100">
                  {s.actividades.map((act) => (
                    <div key={act.actividadId ?? "null"} className="p-4">
                      <h3 className="mb-2.5 text-sm font-semibold text-neutral-700">{act.actividadNombre}</h3>
                      <div className="flex flex-col gap-2">
                        {act.profesores.map((p) => (
                          <details key={p.key} className="group rounded-xl bg-neutral-50 open:bg-white open:ring-1 open:ring-neutral-200">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="truncate font-medium text-neutral-900">{p.nombre}</span>
                                {!p.profesorId && <Badge variant="neutral">Sin cuenta todavía</Badge>}
                              </span>
                              <ChevronRightIcon className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-90" />
                            </summary>
                            <div className="flex flex-col gap-1.5 border-t border-neutral-100 p-3 pt-2.5">
                              {p.horarios.map((h, i) => (
                                <p key={i} className="text-sm text-neutral-600">
                                  <span className="font-medium text-neutral-800">{diaLabel(h.diaSemana)}</span>{" "}
                                  {h.horaInicio.slice(0, 5)} - {h.horaFin.slice(0, 5)}
                                </p>
                              ))}
                              {p.profesorId && (
                                <Link
                                  href={`/profesor/equipo/${p.profesorId}`}
                                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
                                >
                                  Ver sus clases y alumnas (solo lectura)
                                  <ChevronRightIcon className="h-3.5 w-3.5" />
                                </Link>
                              )}
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
