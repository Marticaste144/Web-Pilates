import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type IdentidadAlumno = {
  nombre: string;
  apellido: string;
  email: string | null;
  telefono: string | null;
  /** false = todavía no tiene cuenta de Auth (alumna cargada manualmente). */
  tieneCuenta: boolean;
};

// Una alumna puede o no tener cuenta de Auth (ver migración
// 20260906090000_identidad_alumnas.sql) -- cuando la tiene, sus datos
// personales siguen viviendo en "profiles" (fuente de verdad de siempre,
// sin ningún cambio); cuando no, viven directamente en
// alumnos.{nombre,apellido,email,telefono}. Esta es la ÚNICA función que
// debe resolver "cómo se llama/el email de esta alumna" a partir de un id
// de "alumnos" -- todo lector (admin, profesor, exports) pasa por acá en
// vez de asumir que "profiles" siempre tiene la fila.
export async function mapaIdentidadAlumnos(
  supabase: SupabaseClient<Database>,
  alumnoIds: string[],
): Promise<Map<string, IdentidadAlumno>> {
  const ids = [...new Set(alumnoIds)];
  if (ids.length === 0) return new Map();

  const { data: alumnos } = await supabase
    .from("alumnos")
    .select("id, profile_id, nombre, apellido, email, telefono")
    .in("id", ids);

  const idsConCuenta = (alumnos ?? []).map((a) => a.profile_id).filter((id): id is string => id !== null);
  const { data: perfiles } =
    idsConCuenta.length > 0
      ? await supabase.from("profiles").select("id, nombre, apellido, email, telefono").in("id", idsConCuenta)
      : { data: [] as { id: string; nombre: string; apellido: string; email: string; telefono: string | null }[] };
  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, p]));

  const resultado = new Map<string, IdentidadAlumno>();
  for (const a of alumnos ?? []) {
    const perfil = a.profile_id ? perfilPorId.get(a.profile_id) : null;
    resultado.set(a.id, {
      nombre: perfil?.nombre ?? a.nombre ?? "?",
      apellido: perfil?.apellido ?? a.apellido ?? "",
      email: perfil?.email ?? a.email ?? null,
      telefono: perfil?.telefono ?? a.telefono ?? null,
      tieneCuenta: a.profile_id !== null,
    });
  }
  return resultado;
}

// Variante para un solo id -- mismo criterio, sin armar un Map para una sola fila.
export async function obtenerIdentidadAlumno(
  supabase: SupabaseClient<Database>,
  alumnoId: string,
): Promise<IdentidadAlumno | null> {
  const mapa = await mapaIdentidadAlumnos(supabase, [alumnoId]);
  return mapa.get(alumnoId) ?? null;
}
