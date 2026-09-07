import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotoEstaticaDeProfesor } from "@/lib/landing/profesores-fotos-estaticas";

// "Perfil de profesor" (esta tabla + profiles: nombre/apellido/email/foto)
// y "acceso al sistema" (auth.users: haber aceptado la invitación y puesto
// contraseña) son dos cosas DISTINTAS -- un profesor puede tener el perfil
// cargado sin haber entrado nunca. estadoAcceso sale de auth.users.
// email_confirmed_at (vía admin API, la única fuente real de esto: no es un
// dato que RLS/profiles pueda exponer) -- "invitado" mientras sea null
// (existe el usuario porque se le generó un link, pero todavía no confirmó
// ni eligió contraseña) y "activo" en cuanto lo confirma. No se inventa un
// tercer estado tipo "en línea"/"últimca vez": last_sign_in_at existe pero
// no lo pidió nadie y agregaría un estado no verificado con certeza.
export type EstadoAcceso = "invitado" | "activo";

export type ProfesorListItem = {
  profileId: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  fotoUrl: string | null;
  estadoAcceso: EstadoAcceso;
};

async function mapaEstadoAcceso(ids: string[]): Promise<Map<string, EstadoAcceso>> {
  if (ids.length === 0) return new Map();

  const admin = createAdminClient();
  const entradas = await Promise.all(
    ids.map(async (id): Promise<[string, EstadoAcceso]> => {
      const { data } = await admin.auth.admin.getUserById(id);
      return [id, data?.user?.email_confirmed_at ? "activo" : "invitado"];
    }),
  );
  return new Map(entradas);
}

// Dos queries + merge en vez de un select anidado: como types/database.ts
// está escrito a mano (sin metadata de "Relationships"), el join tipado de
// supabase-js no infiere bien las columnas anidadas. Esto es simple y
// queda 100% tipado igual.
export async function listarProfesores(): Promise<ProfesorListItem[]> {
  const supabase = await createClient();

  const { data: profesores } = await supabase
    .from("profesores")
    .select("profile_id, foto_url");

  if (!profesores || profesores.length === 0) return [];

  const ids = profesores.map((p) => p.profile_id);
  const { data: perfiles } = await supabase
    .from("profiles")
    .select("id, nombre, apellido, email, telefono")
    .in("id", ids);

  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, p]));
  const estadoPorId = await mapaEstadoAcceso(ids);

  const items = profesores
    .map((p): ProfesorListItem | null => {
      const perfil = perfilPorId.get(p.profile_id);
      if (!perfil) return null;
      return {
        profileId: p.profile_id,
        nombre: perfil.nombre,
        apellido: perfil.apellido,
        email: perfil.email,
        telefono: perfil.telefono,
        fotoUrl: p.foto_url
          ? supabase.storage.from("profesores").getPublicUrl(p.foto_url).data.publicUrl
          : fotoEstaticaDeProfesor(perfil.nombre),
        estadoAcceso: estadoPorId.get(p.profile_id) ?? "invitado",
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
    .not("profesor_pendiente_nombre", "is", null);

  const nombres = [...new Set((data ?? []).map((c) => c.profesor_pendiente_nombre as string))];
  return nombres.sort((a, b) => a.localeCompare(b, "es"));
}

export async function obtenerProfesor(profileId: string): Promise<ProfesorListItem | null> {
  const supabase = await createClient();

  const { data: profesor } = await supabase
    .from("profesores")
    .select("profile_id, foto_url")
    .eq("profile_id", profileId)
    .single();

  if (!profesor) return null;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nombre, apellido, email, telefono")
    .eq("id", profileId)
    .single();

  if (!perfil) return null;

  const estado = (await mapaEstadoAcceso([profileId])).get(profileId) ?? "invitado";

  return {
    profileId: profesor.profile_id,
    nombre: perfil.nombre,
    apellido: perfil.apellido,
    email: perfil.email,
    telefono: perfil.telefono,
    fotoUrl: profesor.foto_url
      ? supabase.storage.from("profesores").getPublicUrl(profesor.foto_url).data.publicUrl
      : fotoEstaticaDeProfesor(perfil.nombre),
    estadoAcceso: estado,
  };
}
