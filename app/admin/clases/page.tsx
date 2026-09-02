import Link from "next/link";
import {
  listarClases,
  listarSedes,
  listarProfesoresParaSelect,
  listarActividadesPorSede,
} from "@/lib/admin/clases-data";
import { crearClase } from "@/lib/admin/clases-actions";
import { ClaseForm } from "./clase-form";
import { ClasesTable } from "./clases-table";
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
    // Debajo de md la página fluye normal (como pedido, el "sin scroll" es
    // un requisito de desktop). En md+ el alto queda acotado al viewport
    // (topbar ~76px + el md:pb-10 del AdminShell) para que "Nueva clase" + el
    // listado entren en una sola pantalla -- ClasesTable mide el alto real
    // que le queda dentro de esa franja y decide cuántas filas entran (ver
    // clases-table.tsx).
    <div className="flex flex-col gap-3 md:h-[calc(100dvh-7.25rem)] md:gap-4 md:overflow-hidden">
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

      <ClasesTable clases={clases} />
    </div>
  );
}
