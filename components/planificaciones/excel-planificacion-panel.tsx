import Link from "next/link";
import type { PlanificacionResumen } from "@/lib/planificaciones-data";
import { obtenerWorkbookDePlanificacion } from "@/lib/planificaciones-excel-data";
import { actualizarPlanificacionExcel, guardarCambiosPlanificacionExcel } from "@/lib/planificaciones-excel-actions";
import { ExcelViewer } from "./excel-viewer";
import { DescargarExcelButton } from "./descargar-excel-button";
import { ActualizarExcelToggle } from "./actualizar-excel-toggle";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

// Panel de una planificación formato="excel" -- header (título/versión/quién
// la cargó/cuándo) + acciones (descargar/actualizar/ver historial) + el
// visor. El archivo se descarga y parsea ACÁ (server-side, con la sesión del
// usuario -- misma RLS de storage.objects que ya protege todo lo demás) y al
// componente cliente (ExcelViewer) solo le llega la estructura ya armada,
// nunca el archivo crudo ni una URL persistente.
export async function ExcelPlanificacionPanel({
  plan,
  readOnly,
  historialHref,
}: {
  plan: PlanificacionResumen;
  readOnly: boolean;
  historialHref: string | null;
}) {
  if (!plan.archivoStoragePath) {
    return (
      <Card>
        <Alert variant="error">Esta versión no tiene un archivo asociado -- puede ser un dato inconsistente. Avisá a la administración.</Alert>
      </Card>
    );
  }

  const resultado = await obtenerWorkbookDePlanificacion(plan.archivoStoragePath);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-900">{plan.titulo || `Versión ${plan.version}`}</h2>
            {!plan.esActual && <Badge variant="warning">Histórica -- solo lectura</Badge>}
            {plan.esActual && <Badge variant="success">Actual · v{plan.version}</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            Cargada por {plan.creadoPorNombre} el {formatearFecha(plan.createdAt)}
            {plan.archivoNombreOriginal ? ` · ${plan.archivoNombreOriginal}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {historialHref && (
            <Link href={historialHref} className="text-sm font-medium text-primary-600 hover:underline">
              Ver historial
            </Link>
          )}
          <DescargarExcelButton planificacionId={plan.id} />
          {!readOnly && plan.esActual && (
            <ActualizarExcelToggle subir={actualizarPlanificacionExcel.bind(null, plan.id)} />
          )}
        </div>
      </div>

      <div className="border-t border-neutral-100 pt-3">
        {resultado.ok ? (
          <ExcelViewer
            workbook={resultado.workbook}
            onGuardar={!readOnly && plan.esActual ? guardarCambiosPlanificacionExcel.bind(null, plan.id) : undefined}
          />
        ) : (
          <Alert variant="error">{resultado.message}</Alert>
        )}
      </div>
    </Card>
  );
}
