import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerPlanificacionActualDeClase } from "@/lib/planificaciones-data";
import { crearPlanificacionGrupal } from "@/lib/planificaciones-actions";
import { MetadataPanel } from "./metadata-panel";
import { PlanificacionView } from "./planificacion-view";
import { CrearPlanificacionForm } from "./crear-planificacion-form";
import { ChevronRightIcon } from "@/components/ui/icons";
import { Alert } from "@/components/ui/alert";

// Compartido entre /profesor/clases/[id]/planificacion y
// /admin/clases/[id]/planificacion -- una única planificación por CLASE
// (no por alumno): todas las inscriptas ven y trabajan sobre la misma fila,
// nunca se duplica por alumna. La RLS decide sola quién puede ver/tocar cada
// una según el rol.
export async function GrupalPlanificacionPage({
  claseId,
  volverHref,
  historialHref,
}: {
  claseId: string;
  volverHref: string;
  historialHref: string;
}) {
  const supabase = await createClient();
  const [{ data: clase }, plan] = await Promise.all([
    supabase.from("clases").select("sede_id, actividad_id, modalidad").eq("id", claseId).maybeSingle(),
    obtenerPlanificacionActualDeClase(claseId),
  ]);

  if (!clase) {
    notFound();
  }

  const [{ data: sede }, { data: actividad }] = await Promise.all([
    supabase.from("sedes").select("nombre").eq("id", clase.sede_id).single(),
    clase.actividad_id
      ? supabase.from("actividades").select("nombre").eq("id", clase.actividad_id).single()
      : Promise.resolve({ data: null as { nombre: string } | null }),
  ]);

  const sedeNombre = sede?.nombre ?? "";
  const actividadNombre = actividad?.nombre ?? "";

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <div>
        <Link href={volverHref} className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline">
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">
          Planificación de {sedeNombre}
          {actividadNombre ? ` -- ${actividadNombre}` : ""}
        </h1>
      </div>

      {clase.modalidad !== "grupal" && (
        <Alert variant="warning">
          Esta clase todavía no está marcada como grupal. La planificación grupal es una sola para toda la clase --
          si es una clase personalizada, cada alumna tiene la suya propia desde su ficha.
        </Alert>
      )}

      {!plan ? (
        <CrearPlanificacionForm crear={crearPlanificacionGrupal.bind(null, claseId)} tipoLabel="para esta clase" />
      ) : (
        <>
          <MetadataPanel plan={plan} readOnly={false} historialHref={historialHref} />
          <PlanificacionView plan={plan} readOnly={false} />
        </>
      )}
    </div>
  );
}
