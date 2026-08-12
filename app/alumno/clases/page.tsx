import { listarClasesParaAlumno } from "@/lib/alumno/clases-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { InscripcionControl } from "./inscripcion-control";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function AlumnoClasesPage() {
  const clases = await listarClasesParaAlumno();
  const diaLabel = (dia: number) => DIAS_SEMANA.find((d) => d.value === dia)?.label ?? dia;

  const porSede = new Map<string, typeof clases>();
  for (const c of clases) {
    porSede.set(c.sedeNombre, [...(porSede.get(c.sedeNombre) ?? []), c]);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clases"
        subtitle="Elegí en qué clases anotarte. Si una clase está llena, quedás en lista de espera."
      />

      {clases.length === 0 && (
        <EmptyState
          title="Todavía no hay clases cargadas"
          description="Cuando la administración cargue clases, las vas a ver acá."
        />
      )}

      {[...porSede.entries()].map(([sedeNombre, clasesDeSede]) => (
        <div key={sedeNombre} className="flex flex-col gap-3">
          <h2 className="font-semibold text-neutral-900">{sedeNombre}</h2>
          <div className="flex flex-col gap-2.5">
            {clasesDeSede.map((c) => {
              const lleno = c.inscriptosActivos >= c.cupo;
              return (
                <Card key={c.id} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900">
                      {diaLabel(c.diaSemana)} {c.horaInicio.slice(0, 5)} - {c.horaFin.slice(0, 5)}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                      <span>Prof. {c.profesorNombre}</span>
                      <Badge variant={lleno ? "warning" : "neutral"}>
                        {c.inscriptosActivos}/{c.cupo} lugares
                      </Badge>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <InscripcionControl
                      claseId={c.id}
                      miInscripcionId={c.miInscripcionId}
                      miEstado={c.miEstado}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
