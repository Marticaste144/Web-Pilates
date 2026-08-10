import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenerClase, listarSedes, listarProfesoresParaSelect } from "@/lib/admin/clases-data";
import { actualizarClase } from "@/lib/admin/clases-actions";
import { ClaseForm } from "../clase-form";
import { ToggleActivaButton } from "../toggle-activa-button";

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
        <Link href="/admin/clases" className="text-sm text-[#2f7cd6] hover:underline">
          ← Volver
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900">
            {clase.sedeNombre} -- {clase.profesorNombre}
          </h1>
          <ToggleActivaButton id={clase.id} activa={clase.activa} />
        </div>
      </div>

      <ClaseForm
        action={actualizarClase}
        sedes={sedes}
        profesores={profesores}
        clase={clase}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
