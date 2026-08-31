import { createClient } from "@/lib/supabase/server";

// Compartido entre /admin/alumnos/[id] y /profesor/alumnas/[id] -- la RLS
// (fichas_evaluacion/ficha_evaluacion_notas, migración
// 20260901110000_fichas_evaluacion.sql) ya resuelve sola quién puede ver o
// tocar la ficha de cada alumno según el rol de quien pregunta, así que
// estas funciones no necesitan un requireRole propio: simplemente devuelven
// lo que la base deje ver.

export type FichaEvaluacion = {
  alumnoId: string;
  doloresMolestias: string | null;
  actualizadoPorNombre: string | null;
  updatedAt: string | null; // null = todavía no se cargó ninguna ficha
};

export async function obtenerFicha(alumnoId: string): Promise<FichaEvaluacion> {
  const supabase = await createClient();

  const { data: ficha } = await supabase
    .from("fichas_evaluacion")
    .select("dolores_molestias, actualizado_por, updated_at")
    .eq("alumno_id", alumnoId)
    .maybeSingle();

  if (!ficha) {
    return { alumnoId, doloresMolestias: null, actualizadoPorNombre: null, updatedAt: null };
  }

  let actualizadoPorNombre: string | null = null;
  if (ficha.actualizado_por) {
    const { data: autor } = await supabase
      .from("profiles")
      .select("nombre, apellido")
      .eq("id", ficha.actualizado_por)
      .maybeSingle();
    actualizadoPorNombre = autor ? `${autor.nombre} ${autor.apellido}` : null;
  }

  return {
    alumnoId,
    doloresMolestias: ficha.dolores_molestias,
    actualizadoPorNombre,
    updatedAt: ficha.updated_at,
  };
}

export type NotaEvolucion = {
  id: string;
  autorNombre: string;
  contenido: string;
  fecha: string;
  createdAt: string;
};

export async function listarNotasEvolucion(alumnoId: string): Promise<NotaEvolucion[]> {
  const supabase = await createClient();

  const { data: notas, error } = await supabase
    .from("ficha_evaluacion_notas")
    .select("id, autor_id, contenido, fecha, created_at")
    .eq("alumno_id", alumnoId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fichas-evaluacion-data] error leyendo ficha_evaluacion_notas", error);
    return [];
  }
  if (!notas || notas.length === 0) return [];

  const autorIds = [...new Set(notas.map((n) => n.autor_id).filter((id): id is string => id !== null))];
  const { data: autores } =
    autorIds.length > 0 ? await supabase.from("profiles").select("id, nombre, apellido").in("id", autorIds) : { data: [] };
  const autorPorId = new Map((autores ?? []).map((a) => [a.id, `${a.nombre} ${a.apellido}`]));

  return notas.map((n): NotaEvolucion => ({
    id: n.id,
    autorNombre: (n.autor_id && autorPorId.get(n.autor_id)) || "?",
    contenido: n.contenido,
    fecha: n.fecha,
    createdAt: n.created_at,
  }));
}
