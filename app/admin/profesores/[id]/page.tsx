import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenerProfesor } from "@/lib/admin/profesores-data";
import { listarClasesDeProfesor } from "@/lib/admin/clases-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { ToggleActivoButton } from "../toggle-activo-button";
import { EditarProfesorForm } from "./editar-form";
import { FotoProfesorForm } from "./foto-form";
import { EditarEmailForm } from "./editar-email-form";
import { EliminarProfesorButton } from "./eliminar-button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const MODALIDAD_LABEL: Record<string, string> = { grupal: "Grupal", personalizada: "Personalizada" };

function diaLabel(dia: number) {
  return DIAS_SEMANA.find((d) => d.value === dia)?.label ?? String(dia);
}

export default async function EditarProfesorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profesor, clases] = await Promise.all([obtenerProfesor(id), listarClasesDeProfesor(id)]);

  if (!profesor) {
    notFound();
  }

  const sedes = [...new Set(clases.map((c) => c.sedeNombre))].sort();
  const actividades = [...new Set(clases.map((c) => c.actividadNombre).filter((a): a is string => a !== null))].sort();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/profesores"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">
            {profesor.nombre} {profesor.apellido}
          </h1>
          <ToggleActivoButton profileId={profesor.profileId} activo={profesor.activo} />
        </div>
      </div>

      <Card className="max-w-md">
        <h2 className="mb-3 font-semibold text-neutral-900">Datos personales</h2>
        <EditarProfesorForm profesor={profesor} />
      </Card>

      <Card className="max-w-md">
        <h2 className="mb-1 font-semibold text-neutral-900">Foto pública</h2>
        <p className="mb-3 text-sm text-neutral-500">Se muestra en la sección de profesores de la página de inicio.</p>
        <FotoProfesorForm profileId={profesor.profileId} fotoUrl={profesor.fotoUrl} />
      </Card>

      <Card className="max-w-md">
        <h2 className="mb-3 font-semibold text-neutral-900">Acceso</h2>
        <EditarEmailForm profileId={profesor.profileId} email={profesor.email} />
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-neutral-900">Sedes, actividades y clases</h2>
          <Link href="/admin/clases" className="text-sm font-medium text-primary-600 hover:underline">
            Asignar a otra sede/clase
          </Link>
        </div>

        {clases.length === 0 ? (
          <EmptyState title="Todavía no tiene ninguna clase asignada" />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-4 text-sm text-neutral-600">
              <p>
                <span className="text-neutral-400">Sedes: </span>
                <span className="font-medium text-neutral-800">{sedes.join(", ")}</span>
              </p>
              <p>
                <span className="text-neutral-400">Actividades: </span>
                <span className="font-medium text-neutral-800">
                  {actividades.length > 0 ? actividades.join(", ") : "sin definir"}
                </span>
              </p>
            </div>

            <div className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-card border border-neutral-100">
              {clases.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/clases/${c.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 transition-colors hover:bg-neutral-50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900">
                      {c.sedeNombre}
                      {c.actividadNombre ? ` -- ${c.actividadNombre}` : ""}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {diaLabel(c.diaSemana)} {c.horaInicio.slice(0, 5)} - {c.horaFin.slice(0, 5)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {c.modalidad && <Badge variant="neutral">{MODALIDAD_LABEL[c.modalidad]}</Badge>}
                    {!c.activa && <Badge variant="warning">Inactiva</Badge>}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card className="max-w-md">
        <h2 className="mb-1 font-semibold text-neutral-900">Zona peligrosa</h2>
        <p className="mb-3 text-sm text-neutral-500">
          Elimina la cuenta por completo. No se puede deshacer.
        </p>
        <EliminarProfesorButton profileId={profesor.profileId} />
      </Card>
    </div>
  );
}
