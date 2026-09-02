import Link from "next/link";
import type { PlanificacionResumen } from "@/lib/planificaciones-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

// Listado cronológico simple (sin comparación automática entre versiones,
// todavía no hace falta) -- cada versión abre de solo lectura.
export function HistorialList({ versiones, verHref }: { versiones: PlanificacionResumen[]; verHref: (id: string) => string }) {
  if (versiones.length === 0) {
    return <EmptyState title="Todavía no hay versiones anteriores" description="Van a aparecer acá apenas se cree una nueva versión." />;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {versiones.map((v) => (
        <Link key={v.id} href={verHref(v.id)}>
          <Card className="flex flex-wrap items-center justify-between gap-3 transition-colors hover:border-primary-300">
            <div className="min-w-0">
              <p className="font-medium text-neutral-900">{v.titulo || `Versión ${v.version}`}</p>
              <p className="text-sm text-neutral-500">
                {v.creadoPorNombre} · Creada el {formatearFecha(v.createdAt)}
              </p>
            </div>
            <Badge variant="neutral">Histórica</Badge>
          </Card>
        </Link>
      ))}
    </div>
  );
}
