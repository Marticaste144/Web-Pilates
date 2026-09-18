import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenerClaseDeEquipo, listarAlumnasDeClaseEquipo } from "@/lib/profesor/equipo-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { ChevronRightIcon, UsersIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const MODALIDAD_LABEL: Record<string, string> = { grupal: "Grupal", personalizada: "Personalizada" };

function diaLabel(dia: number): string {
  return DIAS_SEMANA.find((d) => d.value === dia)?.label ?? String(dia);
}

// Vista de SOLO LECTURA de una clase ajena, para "Equipo -> Profesor ->
// Clase". A propósito NO reutiliza /profesor/clases/[id] (esa página tiene
// AsistenciaLista/EditarHorario -- UI de edición que no debe aparecer acá
// ni siquiera deshabilitada): esta es una página aparte, más simple, que
// solo muestra el horario y el roster. Cada alumna lleva a su ficha real
// (/profesor/alumnas/[id]) -- misma página que usa el profesor dueño, en
// modo lectura porque esAlumnaPropiaDelProfesor() da false para cualquiera
// que no sea el dueño real de la clase (ver esa página).
export default async function ClaseDeEquipoPage({
  params,
}: {
  params: Promise<{ profesorId: string; claseId: string }>;
}) {
  const { profesorId, claseId } = await params;

  const [clase, alumnas] = await Promise.all([obtenerClaseDeEquipo(claseId), listarAlumnasDeClaseEquipo(claseId)]);

  if (!clase) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <div>
        <Link
          href={`/profesor/equipo/${profesorId}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver a {clase.profesorNombre}
        </Link>
        <h1 className="mt-2 flex flex-wrap items-center gap-2 text-xl font-bold text-neutral-900 sm:text-2xl">
          {clase.sedeNombre}
          {clase.actividadNombre ? ` -- ${clase.actividadNombre}` : ""}
          <Badge variant="info">Solo lectura</Badge>
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {diaLabel(clase.diaSemana)} {clase.horaInicio.slice(0, 5)} - {clase.horaFin.slice(0, 5)}
          {clase.modalidad ? ` · ${MODALIDAD_LABEL[clase.modalidad]}` : ""} · Profesor/a: {clase.profesorNombre}
        </p>
      </div>

      {clase.modalidad === "grupal" && (
        <LinkButton href={`/profesor/clases/${claseId}/planificacion`} variant="secondary" className="self-start">
          Ver planificación grupal
        </LinkButton>
      )}

      <Card padded={false}>
        <div className="flex items-center gap-2 border-b border-neutral-100 p-4">
          <UsersIcon className="h-4.5 w-4.5 text-neutral-400" />
          <h2 className="font-semibold text-neutral-900">
            Alumnas ({alumnas.length}/{clase.cupo})
          </h2>
        </div>

        {alumnas.length === 0 ? (
          <EmptyState title="Todavía no hay alumnas anotadas en esta clase" />
        ) : (
          <div className="flex flex-col divide-y divide-neutral-100">
            {alumnas.map((a) => (
              <Link
                key={a.alumnoId}
                href={`/profesor/alumnas/${a.alumnoId}`}
                className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-neutral-50"
              >
                <span className="font-medium text-neutral-900">
                  {a.nombre} {a.apellido}
                </span>
                <ChevronRightIcon className="h-4 w-4 text-neutral-300" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
