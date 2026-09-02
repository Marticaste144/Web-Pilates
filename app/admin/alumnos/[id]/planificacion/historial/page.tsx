import { HistorialPage } from "@/components/planificaciones/historial-page";
import { listarHistorialDeAlumno } from "@/lib/planificaciones-data";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const versiones = await listarHistorialDeAlumno(id);

  return (
    <HistorialPage
      versiones={versiones}
      volverHref={`/admin/alumnos/${id}/planificacion`}
      verVersionHref={(versionId) => `/admin/alumnos/${id}/planificacion/historial/${versionId}`}
    />
  );
}
