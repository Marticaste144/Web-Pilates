import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenerPlanificacionPorId } from "@/lib/planificaciones-data";
import { MetadataPanel } from "./metadata-panel";
import { PlanificacionView } from "./planificacion-view";
import { ChevronRightIcon } from "@/components/ui/icons";

// Ver una versión puntual del historial -- sirve tanto para individual como
// grupal (obtenerPlanificacionPorId no distingue el tipo, y la RLS ya solo
// deja pasar si el usuario está autorizado para ESA planificación puntual,
// sea de quien sea). Siempre de solo lectura, reforzado por RLS (no solo
// por no mostrar los botones acá).
export async function VersionHistoricaPage({ versionId, volverHref }: { versionId: string; volverHref: string }) {
  const plan = await obtenerPlanificacionPorId(versionId);

  if (!plan) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <div>
        <Link href={volverHref} className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline">
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver al historial
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">Versión histórica</h1>
      </div>

      <MetadataPanel plan={plan} readOnly historialHref={null} />
      <PlanificacionView plan={plan} readOnly />
    </div>
  );
}
