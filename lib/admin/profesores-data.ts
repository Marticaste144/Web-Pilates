import { createClient } from "@/lib/supabase/server";
import { fotoEstaticaDeProfesor } from "@/lib/landing/profesores-fotos-estaticas";

export type ProfesorListItem = {
  profileId: string;
  activo: boolean;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  fotoUrl: string | null;
};

// Dos queries + merge en vez de un select anidado: como types/database.ts
// está escrito a mano (sin metadata de "Relationships"), el join tipado de
// supabase-js no infiere bien las columnas anidadas. Esto es simple y
// queda 100% tipado igual.
export async function listarProfesores(): Promise<ProfesorListItem[]> {
  const supabase = await createClient();

  const { data: profesores } = await supabase
    .from("profesores")
    .select("profile_id, activo, foto_url");

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
        fotoUrl: p.foto_url
          ? supabase.storage.from("profesores").getPublicUrl(p.foto_url).data.publicUrl
          : fotoEstaticaDeProfesor(perfil.nombre),
      };
    })
    .filter((item): item is ProfesorListItem => item !== null);

  return items.sort((a, b) => a.apellido.localeCompare(b.apellido));
}

// Nombres de profesores reales que ya tienen clases cargadas (BLOQUE DATOS
// REALES) pero todavía sin cuenta de acceso -- clases.profesor_pendiente_nombre.
// Se muestran en /admin/profesores para que la admin sepa a quién le falta
// invitar; invitarProfesor (profesores-actions.ts) vincula automáticamente
// las clases de acá en cuanto el nombre invitado coincide (sin tildes/
// mayúsculas) con uno de estos.
export async function listarNombresPendientesDeCuenta(): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("clases")
    .select("profesor_pendiente_nombre")
    .eq("activa", true)
    .not("profesor_pendiente_nombre", "is", null);

  const nombres = [...new Set((data ?? []).map((c) => c.profesor_pendiente_nombre as string))];
  return nombres.sort((a, b) => a.localeCompare(b, "es"));
}

export async function obtenerProfesor(profileId: string): Promise<ProfesorListItem | null> {
  const supabase = await createClient();

  const { data: profesor } = await supabase
    .from("profesores")
    .select("profile_id, activo, foto_url")
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
    fotoUrl: profesor.foto_url
      ? supabase.storage.from("profesores").getPublicUrl(profesor.foto_url).data.publicUrl
      : fotoEstaticaDeProfesor(perfil.nombre),
  };
}
