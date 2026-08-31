import { createClient } from "@/lib/supabase/server";

export type ClaseSuplencia = {
  id: string;
  sedeId: string;
  sedeNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  profesorOriginalNombre: string;
};

// Clases de profesores que el usuario logueado está reemplazando AHORA
// MISMO (suplencia activa y vigente hoy) -- mismo criterio de vigencia que
// fn_es_suplente_de (base de datos), repetido acá en JS porque acá hace
// falta la lista completa de profesor_id, no un booleano fila por fila.
export async function listarClasesDeSuplencia(): Promise<ClaseSuplencia[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const hoy = new Date().toISOString().slice(0, 10);
  const { data: suplencias } = await supabase
    .from("suplencias")
    .select("profesor_original, fecha_fin")
    .eq("profesor_suplente", user.id)
    .eq("activa", true)
    .lte("fecha_inicio", hoy);

  const profesorIds = [
    ...new Set((suplencias ?? []).filter((s) => !s.fecha_fin || s.fecha_fin >= hoy).map((s) => s.profesor_original)),
  ];

  if (profesorIds.length === 0) return [];

  const [{ data: clases }, { data: perfiles }] = await Promise.all([
    supabase
      .from("clases")
      .select("id, sede_id, profesor_id, dia_semana, hora_inicio, hora_fin")
      .in("profesor_id", profesorIds)
      .eq("activa", true),
    supabase.from("profiles").select("id, nombre, apellido").in("id", profesorIds),
  ]);

  const sedeIds = [...new Set((clases ?? []).map((c) => c.sede_id))];
  const { data: sedes } = await supabase.from("sedes").select("id, nombre").in("id", sedeIds);
  const sedePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, `${p.nombre} ${p.apellido}`]));

  return (clases ?? []).map((c): ClaseSuplencia => ({
    id: c.id,
    sedeId: c.sede_id,
    sedeNombre: sedePorId.get(c.sede_id) ?? "?",
    diaSemana: c.dia_semana,
    horaInicio: c.hora_inicio,
    horaFin: c.hora_fin,
    profesorOriginalNombre: perfilPorId.get(c.profesor_id) ?? "?",
  }));
}
