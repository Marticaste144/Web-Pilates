import { listarAvisos } from "@/lib/admin/avisos-data";
import { listarSedes } from "@/lib/admin/clases-data";
import { AvisoForm } from "./aviso-form";
import { EliminarAvisoButton } from "./eliminar-aviso-button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR");
}

// Mismo criterio de fechas que fn_sede_bloqueada (paso 3): hoy entre
// fecha_inicio y fecha_fin, comparando como fecha (no datetime) para no
// depender de a qué hora del día se mire esto.
function estaVigenteHoy(fechaInicio: string, fechaFin: string): boolean {
  const hoy = new Date().toISOString().slice(0, 10);
  return hoy >= fechaInicio && hoy <= fechaFin;
}

export default async function AvisosPage() {
  const [avisos, sedes] = await Promise.all([listarAvisos(), listarSedes()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Avisos"
        subtitle="Un aviso bloquea toda actividad (inscripción, baja, asistencia) de la sede en su rango de fechas, y manda un email a los alumnos y profesores/as afectados."
      />

      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Nuevo aviso</h2>
        <AvisoForm sedes={sedes} />
      </Card>

      <div className="flex flex-col gap-3">
        {avisos.length === 0 && (
          <EmptyState
            title="Todavía no hay avisos publicados"
            description="Cuando publiques uno, va a aparecer acá."
          />
        )}
        {avisos.map((a) => {
          const vigente = estaVigenteHoy(a.fechaInicio, a.fechaFin);
          return (
            <Card key={a.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-neutral-900">{a.titulo}</p>
                <span className="text-xs text-neutral-500">
                  {formatearFecha(a.fechaInicio)} – {formatearFecha(a.fechaFin)}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-line text-sm text-neutral-600">{a.mensaje}</p>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">
                    {a.todasLasSedes ? "Todas las sedes" : a.sedesNombres.join(", ") || "Sin sede asignada"}
                  </Badge>
                  {vigente && <Badge variant="warning">Bloqueando hoy</Badge>}
                </div>
                <EliminarAvisoButton avisoId={a.id} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
