import { VersionHistoricaPage } from "@/components/planificaciones/version-historica-page";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params;
  return <VersionHistoricaPage versionId={versionId} volverHref={`/profesor/alumnas/${id}/planificacion/historial`} />;
}
