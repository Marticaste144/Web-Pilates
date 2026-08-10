import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenerProfesor } from "@/lib/admin/profesores-data";
import { ToggleActivoButton } from "../toggle-activo-button";
import { EditarProfesorForm } from "./editar-form";

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
        <Link href="/admin/profesores" className="text-sm text-[#2f7cd6] hover:underline">
          ← Volver
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900">
            {profesor.nombre} {profesor.apellido}
          </h1>
          <ToggleActivoButton profileId={profesor.profileId} activo={profesor.activo} />
        </div>
      </div>

      <EditarProfesorForm profesor={profesor} />
    </div>
  );
}
