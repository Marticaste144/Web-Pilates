import type { LineaTiempoItem } from "@/lib/seguimiento-data";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const TIPO_VARIANT: Record<LineaTiempoItem["tipo"], "success" | "warning" | "info" | "neutral"> = {
  evaluacion_inicial: "success",
  reevaluacion: "info",
  evolucion: "neutral",
  feedback: "warning",
};

function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

// Consulta cronológica combinada (Tarea 3): evaluación inicial + evolución +
// feedback de clases + futuras reevaluaciones. Sin edición acá -- cada
// fuente se sigue editando desde su propia sección (Ficha / Evolución); esto
// es solo una vista de lectura que las junta por fecha.
export function LineaDeTiempo({ items }: { items: LineaTiempoItem[] }) {
  if (items.length === 0) {
    return <EmptyState title="Todavía no hay nada para mostrar en la línea de tiempo" />;
  }

  return (
    <div className="flex flex-col divide-y divide-neutral-100 rounded-card border border-neutral-100">
      {items.map((item) => (
        <div key={`${item.tipo}-${item.id}`} className="flex flex-col gap-1 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={TIPO_VARIANT[item.tipo]}>{item.categoriaLabel}</Badge>
              {item.autorNombre && <p className="text-xs font-medium text-neutral-500">{item.autorNombre}</p>}
            </div>
            <p className="text-xs text-neutral-400">{formatearFecha(item.fecha)}</p>
          </div>
          <p className="whitespace-pre-wrap text-sm text-neutral-700">{item.detalle}</p>
          {item.claseLabel && <p className="text-xs text-neutral-400">Clase: {item.claseLabel}</p>}
        </div>
      ))}
    </div>
  );
}
