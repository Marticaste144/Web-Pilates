import { GrupalPlanificacionPage } from "@/components/planificaciones/grupal-planificacion-page";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <GrupalPlanificacionPage
      claseId={id}
      volverHref={`/profesor/clases/${id}`}
      historialHref={`/profesor/clases/${id}/planificacion/historial`}
    />
  );
}
