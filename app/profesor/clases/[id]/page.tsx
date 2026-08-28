import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenerClaseDetalle } from "@/lib/profesor/clases-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { formatearDiaMes } from "@/lib/fecha";
import { AsistenciaLista } from "@/components/profesor/asistencia-lista";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronRightIcon } from "@/components/ui/icons";

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

  const diaLabel = DIAS_SEMANA.find((d) => d.value === clase.diaSemana)?.label ?? String(clase.diaSemana);
  const diaLabelCapitalizado = diaLabel.charAt(0).toUpperCase() + diaLabel.slice(1);

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <div>
        <Link
          href="/profesor"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">{clase.sedeNombre}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {diaLabelCapitalizado} {formatearDiaMes(fecha)} • {clase.horaInicio.slice(0, 5)} -{" "}
          {clase.horaFin.slice(0, 5)} • {clase.totalInscriptos} de {clase.cupo} alumnas
        </p>
      </div>

      {clase.alumnosNoVisibles > 0 && (
        <Alert variant="warning">
          Hay {clase.alumnosNoVisibles} alumna(s) más anotada(s) en esta clase, pero todavía no aparecen
          acá porque no tienen ninguna cuota aprobada.
        </Alert>
      )}

      {clase.alumnosVisibles.length === 0 && clase.alumnosNoVisibles === 0 ? (
        <EmptyState
          title="Todavía no hay alumnas anotadas en esta clase"
          description="En cuanto alguien se anote, va a aparecer acá."
        />
      ) : (
        clase.alumnosVisibles.length > 0 && (
          // key incluye fecha a propósito: al entrar con otra ?fecha= (ej.
          // desde un link viejo), remonta la lista entera para no arrastrar
          // en memoria el estado de presente/ausente de otra fecha.
          <AsistenciaLista key={fecha} claseId={clase.id} fecha={fecha} alumnos={clase.alumnosVisibles} />
        )
      )}
    </div>
  );
}
