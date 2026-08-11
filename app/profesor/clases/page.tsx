import Link from "next/link";
import { listarMisClases } from "@/lib/profesor/clases-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";

export const dynamic = "force-dynamic";

export default async function MisClasesPage() {
  const clases = await listarMisClases();
  const diaLabel = (dia: number) => DIAS_SEMANA.find((d) => d.value === dia)?.label ?? dia;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Mis clases</h1>
        <p className="text-slate-500">Entrá a una clase para ver alumnos y tomar asistencia.</p>
      </div>

      {clases.length === 0 && (
        <p className="text-sm text-slate-400">Todavía no tenés clases asignadas.</p>
      )}

      <div className="flex flex-col gap-2">
        {clases.map((c) => (
          <Link
            key={c.id}
            href={`/profesor/clases/${c.id}`}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:border-[#2f7cd6]"
          >
            <div>
              <p className="font-medium text-slate-900">{c.sedeNombre}</p>
              <p className="text-sm text-slate-500">
                {diaLabel(c.diaSemana)} {c.horaInicio.slice(0, 5)} - {c.horaFin.slice(0, 5)}
              </p>
            </div>
            <span className="text-sm text-slate-500">
              {c.inscriptosActivos}/{c.cupo} lugares
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
