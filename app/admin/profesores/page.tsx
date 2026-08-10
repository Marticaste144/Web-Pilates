import Link from "next/link";
import { listarProfesores } from "@/lib/admin/profesores-data";
import { InvitarProfesorForm } from "./invitar-form";
import { ToggleActivoButton } from "./toggle-activo-button";

export const dynamic = "force-dynamic";

export default async function ProfesoresPage() {
  const profesores = await listarProfesores();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Profesores</h1>
        <p className="text-slate-500">Invitá profesores y editá sus datos.</p>
      </div>

      <InvitarProfesorForm />

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Teléfono</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {profesores.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Todavía no hay profesores invitados.
                </td>
              </tr>
            )}
            {profesores.map((p) => (
              <tr key={p.profileId} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-900">
                  {p.nombre} {p.apellido}
                </td>
                <td className="px-4 py-2 text-slate-600">{p.email}</td>
                <td className="px-4 py-2 text-slate-600">{p.telefono ?? "-"}</td>
                <td className="px-4 py-2">
                  <ToggleActivoButton profileId={p.profileId} activo={p.activo} />
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/profesores/${p.profileId}`} className="text-[#2f7cd6] hover:underline">
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
