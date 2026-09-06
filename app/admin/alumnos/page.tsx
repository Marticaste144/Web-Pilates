import Link from "next/link";
import { listarAlumnos, type OrdenAlumnos, type EstadoAccesoAlumno } from "@/lib/admin/alumnos-data";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const ACCESO_BADGE: Record<EstadoAccesoAlumno, { texto: string; variant: "success" | "neutral" }> = {
  activo: { texto: "Con acceso", variant: "success" },
  invitado: { texto: "Invitación pendiente", variant: "neutral" },
  sin_acceso: { texto: "Sin acceso", variant: "neutral" },
};

type FiltroEstado = "activos" | "inactivos" | "todos";

export default async function AlumnosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; orden?: string; estado?: string }>;
}) {
  const { q, orden: ordenParam, estado: estadoParam } = await searchParams;
  const orden: OrdenAlumnos = ordenParam === "nombre" ? "nombre" : "apellido";
  const filtro: FiltroEstado =
    estadoParam === "inactivos" ? "inactivos" : estadoParam === "todos" ? "todos" : "activos";

  const todasLasAlumnas = await listarAlumnos(q, orden);
  const alumnos =
    filtro === "todos" ? todasLasAlumnas : todasLasAlumnas.filter((a) => a.activo === (filtro === "activos"));
  const cantidadInactivas = todasLasAlumnas.filter((a) => !a.activo).length;

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

        <div className="flex items-center gap-2">
          <LinkButton href="/api/admin/exportar/alumnos" variant="secondary" size="sm">
            Exportar Excel
          </LinkButton>
          <LinkButton href="/admin/alumnos/nueva" size="sm">
            + Agregar alumna
          </LinkButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
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
        <span className="mx-1 text-neutral-300">|</span>
        <span className="text-neutral-500">Mostrar</span>
        {(["activos", "todos", "inactivos"] as const).map((f) => (
          <Link
            key={f}
            href={`/admin/alumnos?${new URLSearchParams({ ...(q ? { q } : {}), orden, ...(f === "activos" ? {} : { estado: f }) })}`}
            className={`font-medium ${filtro === f ? "text-primary-600" : "text-neutral-400 hover:text-primary-600"}`}
          >
            {f === "activos" ? "Activas" : f === "inactivos" ? `Inactivas${cantidadInactivas > 0 ? ` (${cantidadInactivas})` : ""}` : "Todas"}
          </Link>
        ))}
      </div>

      {alumnos.length === 0 && (
        <EmptyState
          title={
            q
              ? "No encontramos alumnas con esa búsqueda"
              : filtro === "inactivos"
                ? "No hay alumnas inactivas"
                : filtro === "activos" && todasLasAlumnas.length > 0
                  ? "No hay alumnas activas"
                  : "Todavía no hay alumnas cargadas"
          }
          description={
            q
              ? "Probá con otro nombre, apellido o email."
              : filtro === "activos" && todasLasAlumnas.length > 0
                ? 'Probá con "Todas" o "Inactivas" arriba.'
                : "Cargá manualmente a las alumnas reales de MUV -- no hace falta que tengan email ni cuenta todavía."
          }
          action={
            !q && filtro !== "inactivos" && todasLasAlumnas.length === 0 ? (
              <LinkButton href="/admin/alumnos/nueva">+ Agregar alumna</LinkButton>
            ) : undefined
          }
        />
      )}

      {alumnos.length > 0 && (
        <Card padded={false}>
          {/* Desktop/tablet: columnas fijas en grid -- mismo criterio que
              profesor/alumnas/alumnas-table.tsx, nunca fuerza scroll
              horizontal como una <table> angosta con muchas columnas. */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-[1.3fr_1.4fr_1fr_auto_auto_auto] gap-4 px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
              <span>Nombre</span>
              <span>Email</span>
              <span>Teléfono</span>
              <span>Acceso</span>
              <span>Clases activas</span>
              <span />
            </div>
            <div className="flex flex-col divide-y divide-neutral-100 border-t border-neutral-100">
              {alumnos.map((a) => (
                <div
                  key={a.alumnoId}
                  className="grid grid-cols-[1.3fr_1.4fr_1fr_auto_auto_auto] items-center gap-4 px-4 py-3"
                >
                  <span className="flex min-w-0 items-center gap-1.5 truncate font-medium text-neutral-900">
                    <span className="truncate">
                      {a.nombre} {a.apellido}
                    </span>
                    {!a.activo && <Badge variant="neutral">Inactiva</Badge>}
                  </span>
                  <span className="min-w-0 truncate text-neutral-600">{a.email ?? "-"}</span>
                  <span className="min-w-0 truncate text-neutral-600">{a.telefono ?? "-"}</span>
                  <Badge variant={ACCESO_BADGE[a.estadoAcceso].variant}>{ACCESO_BADGE[a.estadoAcceso].texto}</Badge>
                  <Badge variant={a.inscripcionesActivas > 0 ? "info" : "neutral"}>{a.inscripcionesActivas}</Badge>
                  <Link href={`/admin/alumnos/${a.alumnoId}`} className="font-medium text-primary-600 hover:underline">
                    Ver
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: una card por alumno, todo el dato visible sin achicar. */}
          <div className="flex flex-col divide-y divide-neutral-100 sm:hidden">
            {alumnos.map((a) => (
              <Link
                key={a.alumnoId}
                href={`/admin/alumnos/${a.alumnoId}`}
                className="flex flex-col gap-1.5 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-neutral-900">
                    {a.nombre} {a.apellido}
                  </p>
                  <Badge variant={a.inscripcionesActivas > 0 ? "info" : "neutral"}>
                    {a.inscripcionesActivas} clase{a.inscripcionesActivas === 1 ? "" : "s"}
                  </Badge>
                </div>
                <p className="text-sm text-neutral-600">{a.email ?? "Sin email"}</p>
                <p className="text-sm text-neutral-600">{a.telefono ?? "Sin teléfono"}</p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <Badge variant={ACCESO_BADGE[a.estadoAcceso].variant}>{ACCESO_BADGE[a.estadoAcceso].texto}</Badge>
                  {!a.activo && <Badge variant="neutral">Inactiva</Badge>}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
