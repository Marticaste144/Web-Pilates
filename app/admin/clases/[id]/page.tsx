import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenerClase, listarSedes, listarProfesoresParaSelect } from "@/lib/admin/clases-data";
import { actualizarClase } from "@/lib/admin/clases-actions";
import { ClaseForm } from "../clase-form";
import { ToggleActivaButton } from "../toggle-activa-button";
import { Card } from "@/components/ui/card";
import { ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function EditarClasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [clase, sedes, profesores] = await Promise.all([
    obtenerClase(id),
    listarSedes(),
    listarProfesoresParaSelect(),
  ]);

  if (!clase) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/clases"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">
            {clase.sedeNombre} -- {clase.profesorNombre}
          </h1>
          <ToggleActivaButton id={clase.id} activa={clase.activa} />
        </div>
      </div>

      <Card>
        <ClaseForm
          action={actualizarClase}
          sedes={sedes}
          profesores={profesores}
          clase={clase}
          submitLabel="Guardar cambios"
        />
      </Card>
    </div>
  );
}
