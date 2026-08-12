import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenerProfesor } from "@/lib/admin/profesores-data";
import { ToggleActivoButton } from "../toggle-activo-button";
import { EditarProfesorForm } from "./editar-form";
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
        <EditarProfesorForm profesor={profesor} />
      </Card>
    </div>
  );
}
