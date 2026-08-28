import Link from "next/link";
import { listarAlumnos, type OrdenAlumnos } from "@/lib/admin/alumnos-data";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AlumnosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; orden?: string }>;
}) {
  const { q, orden: ordenParam } = await searchParams;
  const orden: OrdenAlumnos = ordenParam === "nombre" ? "nombre" : "apellido";
  const alumnos = await listarAlumnos(q, orden);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Alumnos" subtitle="Listado general, con sus datos de contacto y clases activas." />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <form method="get" className="flex gap-2">
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre, apellido o email..."
            className="max-w-sm"
          />
          <input type="hidden" name="orden" value={orden} />
        </form>

        <LinkButton href="/api/admin/exportar/alumnos" variant="secondary" size="sm">
          Exportar CSV
        </LinkButton>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-neutral-500">Ordenar por</span>
        <Link
          href={`/admin/alumnos?${new URLSearchParams({ ...(q ? { q } : {}), orden: "apellido" })}`}
          className={`font-medium ${orden === "apellido" ? "text-primary-600" : "text-neutral-400 hover:text-primary-600"}`}
        >
          Apellido
        </Link>
        <span className="text-neutral-300">·</span>
        <Link
          href={`/admin/alumnos?${new URLSearchParams({ ...(q ? { q } : {}), orden: "nombre" })}`}
          className={`font-medium ${orden === "nombre" ? "text-primary-600" : "text-neutral-400 hover:text-primary-600"}`}
        >
          Nombre
        </Link>
      </div>

      {alumnos.length === 0 && (
        <EmptyState
          title={q ? "No encontramos alumnos con esa búsqueda" : "Todavía no hay alumnos registrados"}
          description={q ? "Probá con otro nombre, apellido o email." : undefined}
        />
      )}

      <Card padded={false} className="overflow-x-auto">
        {alumnos.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 font-medium">Clases activas</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {alumnos.map((a) => (
                <tr key={a.profileId} className="border-t border-neutral-100">
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {a.nombre} {a.apellido}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{a.email}</td>
                  <td className="px-4 py-3 text-neutral-600">{a.telefono ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={a.inscripcionesActivas > 0 ? "info" : "neutral"}>
                      {a.inscripcionesActivas}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/alumnos/${a.profileId}`}
                      className="font-medium text-primary-600 hover:underline"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
