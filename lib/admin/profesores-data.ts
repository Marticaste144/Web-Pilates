import { createClient } from "@/lib/supabase/server";

export type ProfesorListItem = {
  profileId: string;
  activo: boolean;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
};

// Dos queries + merge en vez de un select anidado: como types/database.ts
// está escrito a mano (sin metadata de "Relationships"), el join tipado de
// supabase-js no infiere bien las columnas anidadas. Esto es simple y
// queda 100% tipado igual.
export async function listarProfesores(): Promise<ProfesorListItem[]> {
  const supabase = await createClient();

  const { data: profesores } = await supabase
    .from("profesores")
    .select("profile_id, activo");

  if (!profesores || profesores.length === 0) return [];

  const ids = profesores.map((p) => p.profile_id);
  const { data: perfiles } = await supabase
    .from("profiles")
    .select("id, nombre, apellido, email, telefono")
    .in("id", ids);

  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, p]));

  const items = profesores
    .map((p): ProfesorListItem | null => {
      const perfil = perfilPorId.get(p.profile_id);
      if (!perfil) return null;
      return {
        profileId: p.profile_id,
        activo: p.activo,
        nombre: perfil.nombre,
        apellido: perfil.apellido,
        email: perfil.email,
        telefono: perfil.telefono,
      };
    })
    .filter((item): item is ProfesorListItem => item !== null);

  return items.sort((a, b) => a.apellido.localeCompare(b.apellido));
}

export async function obtenerProfesor(profileId: string): Promise<ProfesorListItem | null> {
  const supabase = await createClient();

  const { data: profesor } = await supabase
    .from("profesores")
    .select("profile_id, activo")
    .eq("profile_id", profileId)
    .single();

  if (!profesor) return null;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nombre, apellido, email, telefono")
    .eq("id", profileId)
    .single();

  if (!perfil) return null;

  return {
    profileId: profesor.profile_id,
    activo: profesor.activo,
    nombre: perfil.nombre,
    apellido: perfil.apellido,
    email: perfil.email,
    telefono: perfil.telefono,
  };
}
