import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listarClasesDeOtroProfesor } from "@/lib/profesor/equipo-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const MODALIDAD_LABEL: Record<string, string> = { grupal: "Grupal", personalizada: "Personalizada" };

function diaLabel(dia: number): string {
  return DIAS_SEMANA.find((d) => d.value === dia)?.label ?? String(dia);
}

// Reemplaza al viejo stub ("las planificaciones son por alumno/clase, no
// por profesor -- consultá desde ahí"): ahora Equipo SÍ permite entrar acá
// y ver, de un vistazo, todas las clases reales de este colega -- pensado
// para prepararse antes de una eventual suplencia (ver migración
// 20260918090000_equipo_consulta_solo_lectura.sql). Cada clase lleva a su
// propio detalle de solo lectura (roster + planificación), nunca a nada
// editable.
export default async function ProfesorEquipoDetallePage({ params }: { params: Promise<{ profesorId: string }> }) {
  const { profesorId } = await params;

  const supabase = await createClient();
  const [{ data: perfilProfesor }, clases] = await Promise.all([
    supabase.from("profiles").select("nombre, apellido").eq("id", profesorId).maybeSingle(),
    listarClasesDeOtroProfesor(profesorId),
  ]);

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
        <p className="mt-1 text-sm text-neutral-500">
          Sus clases, de solo lectura -- útil para prepararte antes de una eventual suplencia.
        </p>
      </div>

      {clases.length === 0 ? (
        <EmptyState title="Todavía no tiene clases asignadas" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {clases.map((c) => (
            <Link key={c.id} href={`/profesor/equipo/${profesorId}/clases/${c.id}`} className="group">
              <Card className="flex items-center justify-between gap-4 transition-colors group-hover:border-primary-400">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900">
                    {c.sedeNombre}
                    {c.actividadNombre ? ` -- ${c.actividadNombre}` : ""}
                  </p>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {diaLabel(c.diaSemana)} {c.horaInicio.slice(0, 5)} - {c.horaFin.slice(0, 5)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {c.modalidad && <Badge variant="neutral">{MODALIDAD_LABEL[c.modalidad]}</Badge>}
                  <ChevronRightIcon className="h-4 w-4 text-neutral-300 group-hover:text-primary-500" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
