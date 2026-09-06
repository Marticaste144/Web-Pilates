import Link from "next/link";
import type { PlanificacionResumen } from "@/lib/planificaciones-data";
import { DescargarExcelButton } from "./descargar-excel-button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

// Listado cronológico simple (sin comparación automática entre versiones,
// todavía no hace falta) -- cada versión abre de solo lectura desde "Ver".
// Para las versiones en Excel se suma "Descargar" acá mismo (sin tener que
// entrar primero) -- por eso el área clickeable de "Ver" es el bloque de
// texto, no toda la card: un botón real no puede anidarse dentro de un
// <Link>.
export function HistorialList({ versiones, verHref }: { versiones: PlanificacionResumen[]; verHref: (id: string) => string }) {
  if (versiones.length === 0) {
    return <EmptyState title="Todavía no hay versiones anteriores" description="Van a aparecer acá apenas se cree una nueva versión." />;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {versiones.map((v) => (
        <Card key={v.id} className="flex flex-wrap items-center justify-between gap-3">
          <Link href={verHref(v.id)} className="min-w-0 flex-1 transition-colors hover:text-primary-700">
            <p className="font-medium text-neutral-900">
              v{v.version} {v.titulo ? `· ${v.titulo}` : ""}
            </p>
            <p className="text-sm text-neutral-500">
              {v.creadoPorNombre} · Creada el {formatearFecha(v.createdAt)}
              {v.formato === "excel" && v.archivoNombreOriginal ? ` · ${v.archivoNombreOriginal}` : ""}
            </p>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="neutral">{v.formato === "excel" ? "Excel" : "Estructurada"}</Badge>
            <Badge variant="neutral">Histórica</Badge>
            {v.formato === "excel" && <DescargarExcelButton planificacionId={v.id} label="Descargar" />}
            <Link href={verHref(v.id)} className="text-sm font-medium text-primary-600 hover:underline">
              Ver
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
