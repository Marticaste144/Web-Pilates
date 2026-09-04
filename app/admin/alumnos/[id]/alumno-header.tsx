import Link from "next/link";
import type { AlumnoInscripcionItem } from "@/lib/admin/alumnos-data";
import { Badge } from "@/components/ui/badge";
import { ChevronRightIcon } from "@/components/ui/icons";

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString("es-AR");
}

// Cabecera compacta, igual en las 6 tabs (se renderiza una sola vez, arriba
// de <AlumnoTabs>). Todo lo que muestra sale de datos reales ya cargados --
// "alumno desde" solo aparece si alumnoDesde no es null (puede faltar si la
// fila de "alumnos" no existiera por algún motivo, nunca se inventa una
// fecha), y sede/actividad son listas ÚNICAS derivadas de las inscripciones
// vigentes, no texto fijo.
export function AlumnoHeader({
  nombre,
  apellido,
  email,
  telefono,
  alumnoDesde,
  inscripciones,
}: {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  alumnoDesde: string | null;
  inscripciones: AlumnoInscripcionItem[];
}) {
  const tieneActiva = inscripciones.some((i) => i.estado === "activa");
  const sedes = [...new Set(inscripciones.map((i) => i.sedeNombre))];
  const actividades = [...new Set(inscripciones.map((i) => i.actividadNombre).filter((a): a is string => a !== null))];

  return (
    <div>
      <Link href="/admin/alumnos" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline">
        <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
        Volver
      </Link>

      <h1 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">
        {nombre} {apellido}
      </h1>
      <p className="text-sm text-neutral-500">
        {email}
        {telefono ? ` · ${telefono}` : ""}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Badge variant={tieneActiva ? "success" : "neutral"}>{tieneActiva ? "Activo" : "Sin clases activas"}</Badge>
        {sedes.map((s) => (
          <Badge key={s} variant="info">
            {s}
          </Badge>
        ))}
        {actividades.map((a) => (
          <Badge key={a} variant="neutral">
            {a}
          </Badge>
        ))}
        {alumnoDesde && <Badge variant="neutral">Alumno/a desde {formatearFecha(alumnoDesde)}</Badge>}
      </div>
    </div>
  );
}
