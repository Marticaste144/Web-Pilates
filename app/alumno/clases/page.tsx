import { listarClasesParaAlumno } from "@/lib/alumno/clases-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { InscripcionControl } from "./inscripcion-control";

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
      <div>
        <h1 className="text-xl font-bold text-slate-900">Clases</h1>
        <p className="text-slate-500">
          Elegí en qué clases anotarte. Si una clase está llena, quedás en lista de espera.
        </p>
      </div>

      {clases.length === 0 && (
        <p className="text-sm text-slate-400">Todavía no hay clases cargadas.</p>
      )}

      {[...porSede.entries()].map(([sedeNombre, clasesDeSede]) => (
        <div key={sedeNombre} className="flex flex-col gap-3">
          <h2 className="font-semibold text-slate-900">{sedeNombre}</h2>
          <div className="flex flex-col gap-2">
            {clasesDeSede.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {diaLabel(c.diaSemana)} {c.horaInicio.slice(0, 5)} - {c.horaFin.slice(0, 5)}
                  </p>
                  <p className="text-sm text-slate-500">
                    Prof. {c.profesorNombre} -- {c.inscriptosActivos}/{c.cupo} lugares
                  </p>
                </div>
                <InscripcionControl
                  claseId={c.id}
                  miInscripcionId={c.miInscripcionId}
                  miEstado={c.miEstado}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
