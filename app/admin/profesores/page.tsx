import Link from "next/link";
import { listarProfesores } from "@/lib/admin/profesores-data";
import { InvitarProfesorForm } from "./invitar-form";
import { ToggleActivoButton } from "./toggle-activo-button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { UserIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function ProfesoresPage() {
  const profesores = await listarProfesores();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profesores" subtitle="Invitá profesores y editá sus datos." />

      <Card>
        <InvitarProfesorForm />
      </Card>

      <Card padded={false} className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {profesores.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  Todavía no hay profesores invitados.
                </td>
              </tr>
            )}
            {profesores.map((p) => (
              <tr key={p.profileId} className="border-t border-neutral-100">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-50 text-primary-300 ring-1 ring-black/5">
                      {p.fotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- URL de Storage/estática dinámica.
                        <img src={p.fotoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserIcon className="h-4.5 w-4.5" />
                      )}
                    </span>
                    <span className="font-medium text-neutral-900">
                      {p.nombre} {p.apellido}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-600">{p.email}</td>
                <td className="px-4 py-3 text-neutral-600">{p.telefono ?? "-"}</td>
                <td className="px-4 py-3">
                  <ToggleActivoButton profileId={p.profileId} activo={p.activo} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/profesores/${p.profileId}`}
                    className="font-medium text-primary-600 hover:underline"
                  >
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
