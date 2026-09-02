import { HistorialPage } from "@/components/planificaciones/historial-page";
import { listarHistorialDeClase } from "@/lib/planificaciones-data";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const versiones = await listarHistorialDeClase(id);
  return (
    <HistorialPage
      versiones={versiones}
      volverHref={`/profesor/clases/${id}/planificacion`}
      verVersionHref={(versionId) => `/profesor/clases/${id}/planificacion/historial/${versionId}`}
    />
  );
}
