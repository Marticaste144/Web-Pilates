import { createClient } from "@/lib/supabase/server";

// El id de "alumnos" (la identidad real de la alumna) ya no es siempre
// auth.uid() -- una alumna puede haber empezado sin cuenta y haber sido
// vinculada después ("Dar acceso a MUV" desde Admin), en cuyo caso
// alumnos.id quedó fijo desde que se creó manualmente y es distinto de su
// auth.uid() actual (ver migración 20260906090000_identidad_alumnas.sql).
// Cualquier Server Action de autoservicio que necesite ESCRIBIR alumno_id
// (inscribirse, confirmar asistencia, dejar feedback, subir comprobante)
// debe resolverlo acá primero -- nunca usar auth.uid() directo como si
// fuera el id de "alumnos". Los SELECT que ya dependen de RLS ("alumno ve
// sus propias inscripciones", etc.) no necesitan esto: la policy se
// encarga sola de resolver la misma identidad del lado de la base.
export async function obtenerMiAlumnoId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("alumnos").select("id").eq("profile_id", user.id).maybeSingle();
  return data?.id ?? null;
}
