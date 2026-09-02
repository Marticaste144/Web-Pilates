import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

// Antes esta página mostraba/editaba una "rutina del profesor" propia
// (rutinas_profesor) -- se deprecó: ese concepto no existe en el negocio
// real de MUV. La planificación ahora pertenece siempre al ALUMNO (clase
// personalizada) o a la CLASE (grupal), nunca al profesor -- ver
// lib/planificaciones-data.ts. Esta pantalla queda como un directorio simple
// (nombre del profesor); si en el futuro hace falta que un suplente vea acá
// mismo qué venía dando cada colega, eso se resuelve consultando la
// planificación de sus alumnos/clases (accesos de suplencia quedaron
// pendientes de definir, ver resumen de esta tarea).
export default async function ProfesorEquipoDetallePage({ params }: { params: Promise<{ profesorId: string }> }) {
  const { profesorId } = await params;

  const supabase = await createClient();
  const { data: perfilProfesor } = await supabase
    .from("profiles")
    .select("nombre, apellido")
    .eq("id", profesorId)
    .single();

  if (!perfilProfesor) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <div>
        <Link
          href="/profesor/equipo"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver a Equipo
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">
          {perfilProfesor.nombre} {perfilProfesor.apellido}
        </h1>
      </div>

      <Card>
        <p className="text-sm text-neutral-500">
          Las planificaciones ahora se gestionan por alumno (clases personalizadas) o por clase (clases grupales),
          no por profesor. Para ver qué viene trabajando este profesor, consultá la planificación del alumno o de la
          clase puntual.
        </p>
      </Card>
    </div>
  );
}
