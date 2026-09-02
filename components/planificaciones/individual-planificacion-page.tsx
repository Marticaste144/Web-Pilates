import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerPlanificacionActualDeAlumno } from "@/lib/planificaciones-data";
import { crearPlanificacionIndividual } from "@/lib/planificaciones-actions";
import { MetadataPanel } from "./metadata-panel";
import { PlanificacionView } from "./planificacion-view";
import { CrearPlanificacionForm } from "./crear-planificacion-form";
import { ChevronRightIcon } from "@/components/ui/icons";

// Compartido entre /profesor/alumnas/[id]/planificacion y
// /admin/alumnos/[id]/planificacion -- la RLS decide sola qué puede ver/
// tocar cada rol, acá no hace falta duplicar esa lógica por vista.
export async function IndividualPlanificacionPage({
  alumnoId,
  volverHref,
  historialHref,
}: {
  alumnoId: string;
  volverHref: string;
  historialHref: string;
}) {
  const supabase = await createClient();
  const [{ data: perfil }, plan] = await Promise.all([
    supabase.from("profiles").select("nombre, apellido").eq("id", alumnoId).eq("role", "alumno").single(),
    obtenerPlanificacionActualDeAlumno(alumnoId),
  ]);

  if (!perfil) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <div>
        <Link href={volverHref} className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline">
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">
          Planificación de {perfil.nombre} {perfil.apellido}
        </h1>
      </div>

      {!plan ? (
        <CrearPlanificacionForm crear={crearPlanificacionIndividual.bind(null, alumnoId)} tipoLabel="para este alumno" />
      ) : (
        <>
          <MetadataPanel plan={plan} readOnly={false} historialHref={historialHref} />
          <PlanificacionView plan={plan} readOnly={false} />
        </>
      )}
    </div>
  );
}
