import Link from "next/link";
import { listarProfesores, listarNombresPendientesDeCuenta } from "@/lib/admin/profesores-data";
import { InvitarProfesorForm } from "./invitar-form";
import { ToggleActivoButton } from "./toggle-activo-button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { UserIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function ProfesoresPage() {
  const [profesores, pendientes] = await Promise.all([listarProfesores(), listarNombresPendientesDeCuenta()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profesores" subtitle="Invitá profesores y editá sus datos." />

      <Card>
        <InvitarProfesorForm />
      </Card>

      {pendientes.length > 0 && (
        <Alert variant="info">
          <p className="font-medium">Todavía sin cuenta (ya tienen clases cargadas):</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pendientes.map((nombre) => (
              <Badge key={nombre} variant="neutral">
                {nombre}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-xs">
            Invitalos con este mismo nombre (sin tildes cambia, mayúsculas no importan) y sus clases se vinculan solas,
            sin duplicar nada.
          </p>
        </Alert>
      )}

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
