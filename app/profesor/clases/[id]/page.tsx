import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerClaseDetalle } from "@/lib/profesor/clases-data";
import { listarFeedbackDeClase } from "@/lib/profesor/feedback-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { formatearDiaMes } from "@/lib/fecha";
import { AsistenciaLista } from "@/components/profesor/asistencia-lista";
import { FechaPicker } from "./fecha-picker";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
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
  const [clase, supabase] = await Promise.all([obtenerClaseDetalle(id, fechaParam), createClient()]);
  if (!clase) {
    notFound();
  }
  const fecha = clase.fecha;
  const [feedback, { data: userData }] = await Promise.all([listarFeedbackDeClase(id), supabase.auth.getUser()]);

  // Suplencia = estoy viendo una clase que no es mía (la RLS ya me dejó
  // pasar porque la estoy cubriendo -- ver fn_es_suplente_de). Solo cambia
  // la Planificación (se muestra de solo lectura); asistencia/ficha/
  // evolución siguen totalmente editables durante la suplencia.
  const esSuplencia = clase.profesorId !== userData.user?.id;

  const diaLabel = DIAS_SEMANA.find((d) => d.value === clase.diaSemana)?.label ?? String(clase.diaSemana);
  const diaLabelCapitalizado = diaLabel.charAt(0).toUpperCase() + diaLabel.slice(1);

  // Pilates no usa planificación (confirmado con Sabina) -- se decide por la
  // actividad real de la clase, no por quién la dicta.
  const mostrarPlanificacion = clase.actividadNombre !== "Pilates";

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
        <h1 className="mt-2 flex flex-wrap items-center gap-2 text-xl font-bold text-neutral-900 sm:text-2xl">
          {clase.sedeNombre}
          {clase.actividadNombre ? ` -- ${clase.actividadNombre}` : ""}
          {esSuplencia && <Badge variant="info">Suplencia</Badge>}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {diaLabelCapitalizado} {formatearDiaMes(fecha)} • {clase.horaInicio.slice(0, 5)} -{" "}
          {clase.horaFin.slice(0, 5)} • {clase.totalInscriptos} de {clase.cupo} alumnas
          {clase.modalidad ? ` • ${clase.modalidad === "grupal" ? "Grupal" : "Personalizada"}` : ""}
        </p>
        <div className="mt-3">
          <FechaPicker fecha={fecha} />
        </div>
      </div>

      {clase.modalidad === "grupal" && mostrarPlanificacion && (
        <LinkButton href={`/profesor/clases/${clase.id}/planificacion`} variant="secondary" className="self-start">
          Ver planificación grupal
        </LinkButton>
      )}

      {clase.alumnosNoVisibles > 0 && (
        <Alert variant="warning">
          Hay {clase.alumnosNoVisibles} alumna(s) más anotada(s) en esta clase, pero todavía no aparecen
          acá porque no tienen ninguna cuota aprobada.
        </Alert>
      )}

      {clase.roster.length === 0 && clase.alumnosNoVisibles === 0 ? (
        <EmptyState
          title="Todavía no hay alumnas anotadas en esta clase"
          description="En cuanto alguien se anote, va a aparecer acá."
        />
      ) : (
        // key incluye fecha a propósito: al entrar con otra ?fecha= (ej.
        // desde un link viejo), remonta la lista entera para no arrastrar
        // en memoria el estado de presente/ausente de otra fecha.
        <AsistenciaLista key={fecha} claseId={clase.id} fecha={fecha} roster={clase.roster} />
      )}

      <Card padded={false}>
        <h2 className="p-4 pb-0 font-semibold text-neutral-900">Feedback de las alumnas</h2>
        {feedback.length === 0 ? (
          <p className="p-4 pt-2 text-sm text-neutral-500">Todavía no dejaron comentarios sobre esta clase.</p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-100">
            {feedback.map((f) => (
              <div key={f.id} className="flex flex-col gap-1 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="font-medium text-neutral-900">{f.alumnoNombre}</p>
                  <p className="text-xs text-neutral-400">{formatearDiaMes(f.fecha)}</p>
                </div>
                <p className="text-sm text-neutral-600">{f.comentario}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
