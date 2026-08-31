import { createClient } from "@/lib/supabase/server";

export type RutinaProfesor = {
  profesorId: string;
  contenido: string | null;
  archivoUrl: string | null;
  archivoNombre: string | null;
  updatedAt: string | null;
};

export async function obtenerRutina(profesorId: string): Promise<RutinaProfesor> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("rutinas_profesor")
    .select("contenido, archivo_url, archivo_nombre, updated_at")
    .eq("profesor_id", profesorId)
    .maybeSingle();

  return {
    profesorId,
    contenido: data?.contenido ?? null,
    archivoUrl: data?.archivo_url ?? null,
    archivoNombre: data?.archivo_nombre ?? null,
    updatedAt: data?.updated_at ?? null,
  };
}
