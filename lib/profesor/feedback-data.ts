import { createClient } from "@/lib/supabase/server";

export type FeedbackClaseItem = {
  id: string;
  alumnoNombre: string;
  fecha: string;
  comentario: string;
  createdAt: string;
};

// Todo el feedback dejado en esta clase (todas las sesiones, no solo la de
// la fecha que se está mirando) -- ordenado por más reciente primero, para
// que el profesor vea de un vistazo si viene pasando algo recurrente.
export async function listarFeedbackDeClase(claseId: string): Promise<FeedbackClaseItem[]> {
  const supabase = await createClient();

  const { data: feedbacks, error } = await supabase
    .from("feedback_clases")
    .select("id, alumno_id, fecha, comentario, created_at")
    .eq("clase_id", claseId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[feedback-data] error leyendo feedback_clases", error);
    return [];
  }

  if (!feedbacks || feedbacks.length === 0) return [];

  const alumnoIds = [...new Set(feedbacks.map((f) => f.alumno_id))];
  const { data: perfiles } = await supabase.from("profiles").select("id, nombre, apellido").in("id", alumnoIds);
  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, `${p.nombre} ${p.apellido}`]));

  return feedbacks.map((f): FeedbackClaseItem => ({
    id: f.id,
    alumnoNombre: perfilPorId.get(f.alumno_id) ?? "?",
    fecha: f.fecha,
    comentario: f.comentario,
    createdAt: f.created_at,
  }));
}
