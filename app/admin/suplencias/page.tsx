import { listarSuplencias } from "@/lib/admin/suplencias-data";
import { listarProfesores } from "@/lib/admin/profesores-data";
import { SuplenciaForm } from "./suplencia-form";
import { TerminarSuplenciaButton } from "./terminar-button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR");
}

function estaVigente(fechaInicio: string, fechaFin: string | null): boolean {
  const hoy = new Date().toISOString().slice(0, 10);
  return hoy >= fechaInicio && (fechaFin === null || hoy <= fechaFin);
}

export default async function SuplenciasPage() {
  const [suplencias, profesores] = await Promise.all([listarSuplencias(), listarProfesores()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Suplencias"
        subtitle="Mientras esté activa y vigente, el suplente ve la lista de alumnos y la ficha de evaluación de TODAS las sedes/clases del profesor reemplazado (acceso de lectura, no puede tomar asistencia en sus clases)."
      />

      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Nueva suplencia</h2>
        <SuplenciaForm profesores={profesores} />
      </Card>

      <div className="flex flex-col gap-3">
        {suplencias.length === 0 && (
          <EmptyState title="Todavía no hay suplencias cargadas" description="Cuando crees una, va a aparecer acá." />
        )}
        {suplencias.map((s) => {
          const vigente = s.activa && estaVigente(s.fechaInicio, s.fechaFin);
          return (
            <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-neutral-900">
                  {s.profesorSuplenteNombre} reemplaza a {s.profesorOriginalNombre}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  Desde {formatearFecha(s.fechaInicio)}
                  {s.fechaFin ? ` hasta ${formatearFecha(s.fechaFin)}` : " -- indefinida"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {!s.activa ? (
                  <Badge variant="neutral">Finalizada</Badge>
                ) : vigente ? (
                  <Badge variant="success">Acceso activo</Badge>
                ) : (
                  <Badge variant="warning">Programada</Badge>
                )}
                {s.activa && <TerminarSuplenciaButton id={s.id} />}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
