import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenerProfesor } from "@/lib/admin/profesores-data";
import { ToggleActivoButton } from "../toggle-activo-button";
import { EditarProfesorForm } from "./editar-form";
import { FotoProfesorForm } from "./foto-form";
import { EditarEmailForm } from "./editar-email-form";
import { EliminarProfesorButton } from "./eliminar-button";
import { Card } from "@/components/ui/card";
import { ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function EditarProfesorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profesor = await obtenerProfesor(id);

  if (!profesor) {
    notFound();
  }

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
