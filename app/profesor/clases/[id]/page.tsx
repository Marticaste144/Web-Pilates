import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenerClaseDetalle } from "@/lib/profesor/clases-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { FechaPicker } from "./fecha-picker";
import { AlumnoRow } from "./alumno-row";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronRightIcon, DownloadIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function ClaseDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { id } = await params;
  const { fecha: fechaParam } = await searchParams;

  // Sin ?fecha= en la URL, obtenerClaseDetalle resuelve la fecha por
  // defecto a la última ocurrencia real del día que dicta esta clase (no a
  // "hoy" a secas) -- ver fechaUltimaOcurrencia en lib/dias-semana.ts.
  const clase = await obtenerClaseDetalle(id, fechaParam);
  if (!clase) {
    notFound();
  }
  const fecha = clase.fecha;

  const diaLabel = DIAS_SEMANA.find((d) => d.value === clase.diaSemana)?.label ?? clase.diaSemana;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/profesor/clases"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">{clase.sedeNombre}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
          <span>
            {diaLabel} {clase.horaInicio.slice(0, 5)} - {clase.horaFin.slice(0, 5)}
          </span>
          <Badge variant="neutral">
            {clase.totalInscriptos}/{clase.cupo} lugares
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FechaPicker fecha={fecha} />
        <a
          href={`/api/profesor/clases/${clase.id}/asistencia-pdf?fecha=${fecha}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <DownloadIcon className="h-4 w-4" />
          Descargar PDF
        </a>
      </div>

      {clase.alumnosNoVisibles > 0 && (
        <Alert variant="warning">
          Hay {clase.alumnosNoVisibles} alumno(s) más anotado(s) en esta clase, pero todavía no aparecen
          acá porque no tienen ninguna cuota aprobada.
        </Alert>
      )}

      {clase.alumnosVisibles.length === 0 && clase.alumnosNoVisibles === 0 && (
        <EmptyState
          title="Todavía no hay alumnos anotados en esta clase"
          description="En cuanto alguien se anote, va a aparecer acá."
        />
      )}

      <div className="flex flex-col gap-3">
        {clase.alumnosVisibles.map((a) => (
          // key incluye fecha a propósito: al cambiar de fecha con el
          // FechaPicker, remonta la fila entera para que no quede pegado en
          // pantalla el mensaje de asistencia ("Marcado/a presente.", error
          // de cuota vencida) de la fecha anterior.
          <AlumnoRow key={`${a.alumnoId}-${fecha}`} alumno={a} claseId={clase.id} fecha={fecha} />
        ))}
      </div>
    </div>
  );
}
