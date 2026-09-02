import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GrupalPlanificacionPage } from "@/components/planificaciones/grupal-planificacion-page";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: clase }, { data: userData }] = await Promise.all([
    supabase.from("clases").select("profesor_id").eq("id", id).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!clase) {
    notFound();
  }

  // Suplente = puede ver esta clase (RLS ya lo autorizó) pero no es su
  // profesor titular -- ve la planificación grupal de solo lectura.
  const readOnly = clase.profesor_id !== userData.user?.id;

  return (
    <GrupalPlanificacionPage
      claseId={id}
      volverHref={`/profesor/clases/${id}`}
      historialHref={`/profesor/clases/${id}/planificacion/historial`}
      readOnly={readOnly}
    />
  );
}
