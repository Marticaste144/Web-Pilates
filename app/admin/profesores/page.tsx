import Link from "next/link";
import { listarProfesores, listarNombresPendientesDeCuenta } from "@/lib/admin/profesores-data";
import { InvitarProfesorForm } from "./invitar-form";
import { ToggleActivoButton } from "./toggle-activo-button";
import { ReenviarInvitacionButton } from "./reenviar-invitacion-button";
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

      {profesores.length === 0 ? (
        <Card>
          <p className="py-4 text-center text-neutral-400">Todavía no hay profesores invitados.</p>
        </Card>
      ) : (
        <Card padded={false}>
          {/* Desktop/tablet: tabla de siempre. Mobile: cards -- 6 columnas
              (foto+nombre, email, teléfono, estado, acceso con su botón de
              reenvío, editar) no entran en una pantalla chica sin volverse
              ilegibles o forzar scroll horizontal permanente. */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acceso</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
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
                    <td className="px-4 py-3">
                      {p.estadoAcceso === "activo" ? (
                        <Badge variant="success">Acceso activo</Badge>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant="neutral">Invitado, sin confirmar</Badge>
                          <ReenviarInvitacionButton profileId={p.profileId} />
                        </div>
                      )}
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
          </div>

          <div className="flex flex-col divide-y divide-neutral-100 sm:hidden">
            {profesores.map((p) => (
              <div key={p.profileId} className="flex flex-col gap-2.5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-50 text-primary-300 ring-1 ring-black/5">
                      {p.fotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- URL de Storage/estática dinámica.
                        <img src={p.fotoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserIcon className="h-4.5 w-4.5" />
                      )}
                    </span>
                    <span className="min-w-0 truncate font-medium text-neutral-900">
                      {p.nombre} {p.apellido}
                    </span>
                  </div>
                  <Link
                    href={`/admin/profesores/${p.profileId}`}
                    className="shrink-0 text-sm font-medium text-primary-600 hover:underline"
                  >
                    Editar
                  </Link>
                </div>
                <p className="text-sm text-neutral-600">{p.email}</p>
                <p className="text-sm text-neutral-600">{p.telefono ?? "Sin teléfono"}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <ToggleActivoButton profileId={p.profileId} activo={p.activo} />
                  {p.estadoAcceso === "activo" ? (
                    <Badge variant="success">Acceso activo</Badge>
                  ) : (
                    <Badge variant="neutral">Invitado, sin confirmar</Badge>
                  )}
                </div>
                {p.estadoAcceso === "invitado" && <ReenviarInvitacionButton profileId={p.profileId} />}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
