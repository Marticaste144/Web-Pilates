import Link from "next/link";
import { listarClases, listarSedes, listarProfesoresParaSelect } from "@/lib/admin/clases-data";
import { DIAS_SEMANA } from "@/lib/admin/dias-semana";
import { crearClase } from "@/lib/admin/clases-actions";
import { ClaseForm } from "./clase-form";
import { ToggleActivaButton } from "./toggle-activa-button";

export const dynamic = "force-dynamic";

export default async function ClasesPage() {
  const [clases, sedes, profesores] = await Promise.all([
    listarClases(),
    listarSedes(),
    listarProfesoresParaSelect(),
  ]);

  const diaLabel = (dia: number) => DIAS_SEMANA.find((d) => d.value === dia)?.label ?? dia;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Clases</h1>
        <p className="text-slate-500">Asigná día, horario, sede y profesor/a de cada clase.</p>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <h2 className="mb-3 font-semibold text-slate-900">Nueva clase</h2>
        {profesores.length === 0 ? (
          <p className="text-sm text-slate-500">
            Todavía no hay profesores invitados --{" "}
            <Link href="/admin/profesores" className="text-[#2f7cd6] hover:underline">
              invitá uno primero
            </Link>
            .
          </p>
        ) : (
          <ClaseForm action={crearClase} sedes={sedes} profesores={profesores} submitLabel="Crear clase" />
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2">Sede</th>
              <th className="px-4 py-2">Día</th>
              <th className="px-4 py-2">Horario</th>
              <th className="px-4 py-2">Profesor/a</th>
              <th className="px-4 py-2">Cupo</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {clases.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Todavía no hay clases cargadas.
                </td>
              </tr>
            )}
            {clases.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-900">{c.sedeNombre}</td>
                <td className="px-4 py-2 text-slate-600">{diaLabel(c.diaSemana)}</td>
                <td className="px-4 py-2 text-slate-600">
                  {c.horaInicio.slice(0, 5)} - {c.horaFin.slice(0, 5)}
                </td>
                <td className="px-4 py-2 text-slate-600">{c.profesorNombre}</td>
                <td className="px-4 py-2 text-slate-600">{c.cupo}</td>
                <td className="px-4 py-2">
                  <ToggleActivaButton id={c.id} activa={c.activa} />
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/clases/${c.id}`} className="text-[#2f7cd6] hover:underline">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
