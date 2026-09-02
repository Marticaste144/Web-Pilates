import { GrupalPlanificacionPage } from "@/components/planificaciones/grupal-planificacion-page";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <GrupalPlanificacionPage
      claseId={id}
      volverHref={`/admin/clases/${id}`}
      historialHref={`/admin/clases/${id}/planificacion/historial`}
    />
  );
}
