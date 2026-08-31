import { createClient } from "@/lib/supabase/server";

export type ProfesorEquipoItem = {
  profesorId: string;
  nombre: string;
  apellido: string;
};

export type SedeConProfesores = {
  sedeId: string;
  sedeNombre: string;
  profesores: ProfesorEquipoItem[];
};

// Agrupa a los profesores por sede a partir de sus clases activas (no hay un
// campo "sede" directo en profesores/profiles) -- un profesor que dicta en
// más de una sede aparece en cada una. Todas las sedes se muestran, aunque
// no tengan profesores todavía.
export async function listarEquipoPorSede(): Promise<SedeConProfesores[]> {
  const supabase = await createClient();

  const [{ data: sedes }, { data: clases }] = await Promise.all([
    supabase.from("sedes").select("id, nombre").order("nombre"),
    supabase.from("clases").select("sede_id, profesor_id").eq("activa", true),
  ]);

  const profesorIdsPorSede = new Map<string, Set<string>>();
  for (const c of clases ?? []) {
    const set = profesorIdsPorSede.get(c.sede_id) ?? new Set<string>();
    set.add(c.profesor_id);
    profesorIdsPorSede.set(c.sede_id, set);
  }

  const todosProfesorIds = [...new Set((clases ?? []).map((c) => c.profesor_id))];
  const { data: perfiles } =
    todosProfesorIds.length > 0
      ? await supabase.from("profiles").select("id, nombre, apellido").in("id", todosProfesorIds)
      : { data: [] as { id: string; nombre: string; apellido: string }[] };

  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, p]));

  return (sedes ?? []).map((s): SedeConProfesores => {
    const ids = [...(profesorIdsPorSede.get(s.id) ?? [])];
    const profesores = ids
      .map((id) => perfilPorId.get(id))
      .filter((p): p is { id: string; nombre: string; apellido: string } => !!p)
      .map((p): ProfesorEquipoItem => ({ profesorId: p.id, nombre: p.nombre, apellido: p.apellido }))
      .sort((a, b) => a.apellido.localeCompare(b.apellido));
    return { sedeId: s.id, sedeNombre: s.nombre, profesores };
  });
}
