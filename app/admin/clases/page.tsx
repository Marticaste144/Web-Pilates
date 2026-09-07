import Link from "next/link";
import {
  listarClases,
  listarSedes,
  listarProfesoresParaSelect,
  listarActividadesPorSede,
} from "@/lib/admin/clases-data";
import { crearClase } from "@/lib/admin/clases-actions";
import { ClaseForm } from "./clase-form";
import { ClasesFiltros } from "./clases-filtros";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export default async function ClasesPage() {
  const [clases, sedes, profesores, actividadesPorSede] = await Promise.all([
    listarClases(),
    listarSedes(),
    listarProfesoresParaSelect(),
    listarActividadesPorSede(),
  ]);

  return (
    // CORRECCIÓN (auditoría general): antes esta página forzaba un alto fijo
    // (calc(100dvh-7.25rem)) + overflow-hidden para que "todo entrara en una
    // sola pantalla sin scroll", y ClasesTable medía cuántas filas entraban
    // ahí adentro -- cualquier desajuste entre lo medido y el alto real
    // (fuente sin cargar, zoom, alto real del header) recortaba filas y
    // tapaba el paginador en vez de mostrarlos. Ahora la página fluye
    // normal en todos los tamaños (scroll de página si hace falta, como
    // cualquier página larga) y ClasesTable pagina con un tamaño fijo por
    // breakpoint -- sin medir nada, sin overflow-hidden, sin riesgo de
    // recorte.
    <div className="flex flex-col gap-4">
      <PageHeader title="Clases" subtitle="Asigná día, horario, sede y profesor/a de cada clase." />

      <Card className="!p-3 shrink-0 sm:!p-4">
        <h2 className="mb-2 font-semibold text-neutral-900">Nueva clase</h2>
        {profesores.length === 0 ? (
          <Alert variant="info">
            Todavía no hay profesores invitados --{" "}
            <Link href="/admin/profesores" className="font-medium underline">
              invitá uno primero
            </Link>
            .
          </Alert>
        ) : (
          <ClaseForm
            action={crearClase}
            sedes={sedes}
            profesores={profesores}
            actividadesPorSede={actividadesPorSede}
            submitLabel="Crear clase"
          />
        )}
      </Card>

      <ClasesFiltros clases={clases} />
    </div>
  );
}
