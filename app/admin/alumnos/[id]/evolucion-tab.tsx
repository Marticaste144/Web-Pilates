import type { NotaEvolucion, ClaseOption } from "@/lib/fichas-evaluacion-data";
import type { LineaTiempoItem } from "@/lib/seguimiento-data";
import { NotasEvolucion } from "@/components/fichas-evaluacion/notas-evolucion";
import { LineaDeTiempo } from "@/components/fichas-evaluacion/linea-de-tiempo";
import { Card } from "@/components/ui/card";

// Unifica carga de nota + historial + línea de tiempo en un solo lugar
// (antes eran 3 cards separadas, dos de ellas mostrando en parte lo mismo).
// mostrarLista=false en NotasEvolucion: el historial de notas propio queda
// afuera acá porque LineaDeTiempo ya lo incluye (evaluación inicial +
// evolución + reevaluaciones + feedback, todo junto, más completo) --
// mostrar las dos listas hubiera duplicado cada nota de evolución dos veces.
export function EvolucionTab({
  alumnoId,
  notas,
  clases,
  lineaDeTiempo,
}: {
  alumnoId: string;
  notas: NotaEvolucion[];
  clases: ClaseOption[];
  lineaDeTiempo: LineaTiempoItem[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Agregar nota de evolución</h2>
        <NotasEvolucion alumnoId={alumnoId} notas={notas} clases={clases} mostrarLista={false} />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Línea de tiempo</h2>
        {lineaDeTiempo.length === 0 ? (
          <p className="text-sm text-neutral-400">Todavía no hay nada para mostrar acá.</p>
        ) : (
          <LineaDeTiempo items={lineaDeTiempo} />
        )}
      </Card>
    </div>
  );
}
