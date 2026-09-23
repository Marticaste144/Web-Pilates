import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerPlanificacionActualDeClase } from "@/lib/planificaciones-data";
import { crearPlanificacionGrupal } from "@/lib/planificaciones-actions";
import { cargarPlanificacionExcelGrupal } from "@/lib/planificaciones-excel-actions";
import { MetadataPanel } from "./metadata-panel";
import { PlanificacionView } from "./planificacion-view";
import { ExcelPlanificacionPanel } from "./excel-planificacion-panel";
import { SinPlanificacion } from "./sin-planificacion";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronRightIcon } from "@/components/ui/icons";
import { Alert } from "@/components/ui/alert";

// Compartido entre /profesor/clases/[id]/planificacion y
// /admin/clases/[id]/planificacion -- una única planificación por CLASE
// (no por alumno): todas las inscriptas ven y trabajan sobre la misma fila,
// nunca se duplica por alumna. La RLS decide sola quién puede ver/tocar cada
// una según el rol.
//
// `readOnly` la usa /profesor/clases/[id] (Bloque 4) cuando quien mira la
// clase es un suplente: puede VER la planificación grupal pero no tocarla --
// la RLS de suplencias ya lo bloquea también del lado de la base.
export async function GrupalPlanificacionPage({
  claseId,
  volverHref,
  historialHref,
  readOnly = false,
}: {
  claseId: string;
  volverHref: string;
  historialHref: string;
  readOnly?: boolean;
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
          si es una clase personalizada, cada alumno tiene la suya propia desde su ficha.
        </Alert>
      )}

      {readOnly && (
        <Alert variant="info">Estás viendo esta planificación por una suplencia activa -- podés consultarla, pero no editarla.</Alert>
      )}

      {!plan ? (
        readOnly || clase.modalidad !== "grupal" ? (
          // No se ofrece crear una planificación grupal para una clase que
          // no está marcada como tal -- no se "inventa" una clase grupal
          // solo porque alguien quiso cargarle una planificación acá. Si
          // más adelante la clase se marca grupal de verdad, el botón
          // aparece solo, sin tocar nada de esto.
          <EmptyState
            title="Todavía no hay una planificación cargada"
            description={
              readOnly
                ? "El profesor titular todavía no cargó ninguna."
                : "Esta clase no está marcada como grupal -- no se puede cargar una planificación grupal acá."
            }
          />
        ) : (
          <SinPlanificacion
            tipoLabel="para esta clase"
            crearExcel={cargarPlanificacionExcelGrupal.bind(null, claseId)}
            crearEstructurada={crearPlanificacionGrupal.bind(null, claseId)}
          />
        )
      ) : plan.formato === "excel" ? (
        <ExcelPlanificacionPanel plan={plan} readOnly={readOnly} historialHref={historialHref} />
      ) : (
        <>
          <MetadataPanel plan={plan} readOnly={readOnly} historialHref={historialHref} />
          <PlanificacionView plan={plan} readOnly={readOnly} />
        </>
      )}
    </div>
  );
}
