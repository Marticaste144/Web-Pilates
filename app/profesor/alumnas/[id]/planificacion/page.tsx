import { IndividualPlanificacionPage } from "@/components/planificaciones/individual-planificacion-page";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <IndividualPlanificacionPage
      alumnoId={id}
      volverHref={`/profesor/alumnas/${id}`}
      historialHref={`/profesor/alumnas/${id}/planificacion/historial`}
    />
  );
}
