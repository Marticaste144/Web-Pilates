import { HistorialPage } from "@/components/planificaciones/historial-page";
import { listarHistorialDeAlumno } from "@/lib/planificaciones-data";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const versiones = await listarHistorialDeAlumno(id);

  return (
    <HistorialPage
      versiones={versiones}
      volverHref={`/profesor/alumnas/${id}/planificacion`}
      verVersionHref={(versionId) => `/profesor/alumnas/${id}/planificacion/historial/${versionId}`}
    />
  );
}
