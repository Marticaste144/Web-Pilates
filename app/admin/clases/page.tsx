import Link from "next/link";
import { listarClases, listarSedes, listarProfesoresParaSelect } from "@/lib/admin/clases-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { crearClase } from "@/lib/admin/clases-actions";
import { ClaseForm } from "./clase-form";
import { ToggleActivaButton } from "./toggle-activa-button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

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
      <PageHeader title="Clases" subtitle="Asigná día, horario, sede y profesor/a de cada clase." />

      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Nueva clase</h2>
        {profesores.length === 0 ? (
          <Alert variant="info">
            Todavía no hay profesores invitados --{" "}
            <Link href="/admin/profesores" className="font-medium underline">
              invitá uno primero
            </Link>
            .
          </Alert>
        ) : (
          <ClaseForm action={crearClase} sedes={sedes} profesores={profesores} submitLabel="Crear clase" />
        )}
      </Card>

      <Card padded={false} className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Sede</th>
              <th className="px-4 py-3 font-medium">Día</th>
              <th className="px-4 py-3 font-medium">Horario</th>
              <th className="px-4 py-3 font-medium">Profesor/a</th>
              <th className="px-4 py-3 font-medium">Cupo</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {clases.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  Todavía no hay clases cargadas.
                </td>
              </tr>
            )}
            {clases.map((c) => (
              <tr key={c.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 text-neutral-900">{c.sedeNombre}</td>
                <td className="px-4 py-3 text-neutral-600">{diaLabel(c.diaSemana)}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {c.horaInicio.slice(0, 5)} - {c.horaFin.slice(0, 5)}
                </td>
                <td className="px-4 py-3 text-neutral-600">{c.profesorNombre}</td>
                <td className="px-4 py-3 text-neutral-600">{c.cupo}</td>
                <td className="px-4 py-3">
                  <ToggleActivaButton id={c.id} activa={c.activa} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/clases/${c.id}`} className="font-medium text-primary-600 hover:underline">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
