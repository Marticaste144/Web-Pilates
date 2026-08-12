import { listarAvisos } from "@/lib/admin/avisos-data";
import { listarSedes } from "@/lib/admin/clases-data";
import { AvisoForm } from "./aviso-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR");
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
        {avisos.map((a) => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-neutral-900">{a.titulo}</p>
              <span className="text-xs text-neutral-500">
                {formatearFecha(a.fechaInicio)} – {formatearFecha(a.fechaFin)}
              </span>
            </div>
            <p className="mt-1.5 whitespace-pre-line text-sm text-neutral-600">{a.mensaje}</p>
            <div className="mt-2.5">
              <Badge variant="info">
                {a.todasLasSedes ? "Todas las sedes" : a.sedesNombres.join(", ") || "Sin sede asignada"}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
