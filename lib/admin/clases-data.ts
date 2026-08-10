import { createClient } from "@/lib/supabase/server";

export type SedeItem = { id: string; nombre: string };
export type ProfesorSelectItem = { profileId: string; nombre: string; apellido: string; activo: boolean };

export type ClaseListItem = {
  id: string;
  sedeId: string;
  sedeNombre: string;
  profesorId: string;
  profesorNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  cupo: number;
  activa: boolean;
};

export async function listarSedes(): Promise<SedeItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("sedes").select("id, nombre").order("nombre");
  return data ?? [];
}

export async function listarProfesoresParaSelect(): Promise<ProfesorSelectItem[]> {
  const supabase = await createClient();

  const { data: profesores } = await supabase.from("profesores").select("profile_id, activo");
  if (!profesores || profesores.length === 0) return [];

  const ids = profesores.map((p) => p.profile_id);
  const { data: perfiles } = await supabase
    .from("profiles")
    .select("id, nombre, apellido")
    .in("id", ids);

  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, p]));

  return profesores
    .map((p): ProfesorSelectItem | null => {
      const perfil = perfilPorId.get(p.profile_id);
      if (!perfil) return null;
      return { profileId: p.profile_id, nombre: perfil.nombre, apellido: perfil.apellido, activo: p.activo };
    })
    .filter((p): p is ProfesorSelectItem => p !== null)
    .sort((a, b) => a.apellido.localeCompare(b.apellido));
}

export async function listarClases(): Promise<ClaseListItem[]> {
  const supabase = await createClient();

  const { data: clases } = await supabase
    .from("clases")
    .select("id, sede_id, profesor_id, dia_semana, hora_inicio, hora_fin, cupo, activa");

  if (!clases || clases.length === 0) return [];

  const [{ data: sedes }, profesores] = await Promise.all([
    supabase.from("sedes").select("id, nombre"),
    listarProfesoresParaSelect(),
  ]);

  const sedePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  const profesorPorId = new Map(profesores.map((p) => [p.profileId, `${p.nombre} ${p.apellido}`]));

  return clases
    .map((c): ClaseListItem => ({
      id: c.id,
      sedeId: c.sede_id,
      sedeNombre: sedePorId.get(c.sede_id) ?? "?",
      profesorId: c.profesor_id,
      profesorNombre: profesorPorId.get(c.profesor_id) ?? "?",
      diaSemana: c.dia_semana,
      horaInicio: c.hora_inicio,
      horaFin: c.hora_fin,
      cupo: c.cupo,
      activa: c.activa,
    }))
    .sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio));
}

export async function obtenerClase(id: string): Promise<ClaseListItem | null> {
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("clases")
    .select("id, sede_id, profesor_id, dia_semana, hora_inicio, hora_fin, cupo, activa")
    .eq("id", id)
    .single();

  if (!c) return null;

  const [{ data: sede }, { data: perfil }] = await Promise.all([
    supabase.from("sedes").select("nombre").eq("id", c.sede_id).single(),
    supabase.from("profiles").select("nombre, apellido").eq("id", c.profesor_id).single(),
  ]);

  return {
    id: c.id,
    sedeId: c.sede_id,
    sedeNombre: sede?.nombre ?? "?",
    profesorId: c.profesor_id,
    profesorNombre: perfil ? `${perfil.nombre} ${perfil.apellido}` : "?",
    diaSemana: c.dia_semana,
    horaInicio: c.hora_inicio,
    horaFin: c.hora_fin,
    cupo: c.cupo,
    activa: c.activa,
  };
}
