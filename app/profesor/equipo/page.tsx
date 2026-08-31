import Link from "next/link";
import { listarEquipoPorSede } from "@/lib/profesor/equipo-data";
import { SedeIcon } from "@/components/alumno/sede-icon";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const sedes = await listarEquipoPorSede();
  const hayProfesores = sedes.some((s) => s.profesores.length > 0);

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">Equipo</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Profesores por sede y la rutina que viene dando cada uno/a -- útil si tenés que reemplazar a alguien.
        </p>
      </div>

      {!hayProfesores ? (
        <EmptyState title="Todavía no hay profesores con clases asignadas" />
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

              {s.profesores.length === 0 ? (
                <p className="p-4 text-sm text-neutral-500">Todavía no hay profesores asignados en esta sede.</p>
              ) : (
                <div className="flex flex-col divide-y divide-neutral-100">
                  {s.profesores.map((p) => (
                    <Link
                      key={p.profesorId}
                      href={`/profesor/equipo/${p.profesorId}`}
                      className="group flex items-center justify-between gap-3 p-4 transition-colors hover:bg-neutral-50"
                    >
                      <span className="font-medium text-neutral-900">
                        {p.nombre} {p.apellido}
                      </span>
                      <ChevronRightIcon className="h-4 w-4 text-neutral-300 group-hover:text-primary-500" />
                    </Link>
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
