import Link from "next/link";
import type { PlanificacionResumen } from "@/lib/planificaciones-data";
import { HistorialList } from "./historial-list";
import { ChevronRightIcon } from "@/components/ui/icons";

// Compartido entre historial individual (alumno) y grupal (clase) -- ambos
// solo difieren en de dónde sacan `versiones` (ver los page.tsx que llaman
// a esto), la presentación es la misma.
export function HistorialPage({
  versiones,
  volverHref,
  verVersionHref,
  titulo = "Historial de planificaciones",
}: {
  versiones: PlanificacionResumen[];
  volverHref: string;
  verVersionHref: (id: string) => string;
  titulo?: string;
}) {
  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <div>
        <Link href={volverHref} className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline">
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver a la planificación actual
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">{titulo}</h1>
      </div>

      <HistorialList versiones={versiones} verHref={verVersionHref} />
    </div>
  );
}
