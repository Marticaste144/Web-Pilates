import { createClient } from "@/lib/supabase/server";

export type ProfesorPublico = {
  id: string;
  nombre: string;
  apellido: string;
  fotoUrl: string | null;
};

// Público (landing sin sesión) -- lee de la vista v_profesores_publicos, que
// ya filtra "activo" y solo expone nombre/apellido/foto (ver migración
// 20260901090000_profesores_foto_publica.sql). foto_url guarda un PATH del
// bucket "profesores" (público), no una URL -- getPublicUrl solo arma el
// string, no hace ningún request de red.
export async function listarProfesoresPublicos(): Promise<ProfesorPublico[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("v_profesores_publicos").select("id, nombre, apellido, foto_url");

  if (error) {
    console.error("[landing/profesores-data] error leyendo v_profesores_publicos", error);
    return [];
  }

  return (data ?? []).map((p): ProfesorPublico => ({
    id: p.id,
    nombre: p.nombre,
    apellido: p.apellido,
    fotoUrl: p.foto_url ? supabase.storage.from("profesores").getPublicUrl(p.foto_url).data.publicUrl : null,
  }));
}
