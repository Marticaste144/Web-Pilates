import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerIdentidadAlumno } from "@/lib/alumnos-identidad";
import { obtenerPlanificacionActualDeAlumno } from "@/lib/planificaciones-data";
import { crearPlanificacionIndividual } from "@/lib/planificaciones-actions";
import { cargarPlanificacionExcelIndividual } from "@/lib/planificaciones-excel-actions";
import { MetadataPanel } from "./metadata-panel";
import { PlanificacionView } from "./planificacion-view";
import { ExcelPlanificacionPanel } from "./excel-planificacion-panel";
import { SinPlanificacion } from "./sin-planificacion";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { ChevronRightIcon } from "@/components/ui/icons";

// Compartido entre /profesor/alumnas/[id]/planificacion y
// /admin/alumnos/[id]/planificacion -- la RLS decide sola qué puede ver/
// tocar cada rol, acá no hace falta duplicar esa lógica por vista.
//
// `embedded` la usa el perfil del profesor (Bloque 4) para incrustar esto
// como una tab más, sin repetir el encabezado "Volver"/título de la página
// contenedora. `readOnly` la usa el mismo perfil cuando quien mira es un
// suplente: puede VER la planificación pero no crearla/tocarla -- ver
// migración de suplencias, RLS ya lo bloquea también del lado de la base.
export async function IndividualPlanificacionPage({
  alumnoId,
  volverHref,
  historialHref,
  embedded = false,
  readOnly = false,
}: {
  alumnoId: string;
  volverHref: string;
  historialHref: string;
  embedded?: boolean;
  readOnly?: boolean;
}) {
  const supabase = await createClient();
  const [identidad, plan] = await Promise.all([
    obtenerIdentidadAlumno(supabase, alumnoId),
    obtenerPlanificacionActualDeAlumno(alumnoId),
  ]);

  if (!identidad) {
    notFound();
  }

  return (
    <div className={embedded ? "flex flex-col gap-4" : "flex flex-col gap-4 py-4 sm:gap-5 sm:py-5"}>
      {!embedded && (
        <div>
          <Link href={volverHref} className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline">
            <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
            Volver
          </Link>
          <h1 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">
            Planificación de {identidad.nombre} {identidad.apellido}
          </h1>
        </div>
      )}

      {readOnly && (
        <Alert variant="info">Estás viendo esta planificación por una suplencia activa -- podés consultarla, pero no editarla.</Alert>
      )}

      {!plan ? (
        readOnly ? (
          <EmptyState title="Todavía no hay una planificación cargada" description="El profesor titular todavía no cargó ninguna." />
        ) : (
          <SinPlanificacion
            tipoLabel="para este alumno"
            crearExcel={cargarPlanificacionExcelIndividual.bind(null, alumnoId)}
            crearEstructurada={crearPlanificacionIndividual.bind(null, alumnoId)}
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
