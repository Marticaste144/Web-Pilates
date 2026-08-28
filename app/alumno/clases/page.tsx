import Link from "next/link";
import { listarClasesParaAlumno, listarSedes } from "@/lib/alumno/clases-data";
import { SedeIcon } from "@/components/alumno/sede-icon";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

// Antes esta pantalla listaba TODOS los horarios de las 3 sedes mezclados en
// una sola pantalla -- no escala a medida que se cargan más clases, y a la
// mayoría de los alumnos solo le interesa una sede. Ahora es un selector de
// sede (3 cards); el listado de horarios de cada sede vive en
// /alumno/clases/[sedeId], con un selector de día aparte. La lógica de
// inscripción/baja no cambió -- esto es puramente de navegación.
export default async function AlumnoClasesPage() {
  const [sedes, clases] = await Promise.all([listarSedes(), listarClasesParaAlumno()]);

  const cantidadPorSede = new Map<string, number>();
  for (const c of clases) {
    cantidadPorSede.set(c.sedeId, (cantidadPorSede.get(c.sedeId) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <PageHeader title="Clases" subtitle="Elegí una sede para ver los horarios disponibles y anotarte." />

      {sedes.length === 0 ? (
        <EmptyState title="Todavía no hay sedes cargadas" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sedes.map((sede) => {
            const cantidad = cantidadPorSede.get(sede.id) ?? 0;
            return (
              <Link key={sede.id} href={`/alumno/clases/${sede.id}`} className="group">
                <Card className="flex h-full flex-col items-start gap-4 transition-colors group-hover:border-primary-400">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary-50 text-secondary-600">
                    <SedeIcon nombre={sede.nombre} className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold uppercase tracking-wide text-neutral-900">{sede.nombre}</h2>
                    <p className="mt-0.5 text-sm text-neutral-500">
                      {cantidad === 0
                        ? "Todavía sin horarios"
                        : `${cantidad} horario${cantidad === 1 ? "" : "s"} disponible${cantidad === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 group-hover:underline">
                    Ver horarios
                    <ChevronRightIcon className="h-4 w-4" />
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
