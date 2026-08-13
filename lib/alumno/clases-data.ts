import { createClient } from "@/lib/supabase/server";
import type { EstadoInscripcion } from "@/types/database";

export type ClaseDisponible = {
  id: string;
  sedeId: string;
  sedeNombre: string;
  profesorNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  cupo: number;
  inscriptosActivos: number;
  miInscripcionId: string | null;
  miEstado: EstadoInscripcion | null;
};

export type SedeItem = { id: string; nombre: string };

// Las 3 sedes son fijas y cualquier usuario autenticado puede leerlas (RLS:
// "autenticados ven sedes"). Se usa para listar las 3 cards aunque alguna
// todavía no tenga clases cargadas -- listarClasesParaAlumno() por sí sola
// no alcanzaría para eso, porque una sede sin clases no aparecería ahí.
export async function listarSedes(): Promise<SedeItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("sedes").select("id, nombre").order("nombre");
  return data ?? [];
}

export async function listarClasesParaAlumno(): Promise<ClaseDisponible[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: clases }, { data: sedes }, { data: cupos }, { data: misInscripciones }] =
    await Promise.all([
      supabase
        .from("clases")
        .select("id, sede_id, profesor_id, dia_semana, hora_inicio, hora_fin, cupo")
        .eq("activa", true),
      supabase.from("sedes").select("id, nombre"),
      supabase.from("v_cupo_clases").select("clase_id, inscriptos_activos"),
      supabase
        .from("inscripciones")
        .select("id, clase_id, estado")
        .in("estado", ["activa", "lista_espera"]),
    ]);

  if (!clases || clases.length === 0) return [];

  const profesorIds = [...new Set(clases.map((c) => c.profesor_id))];
  const { data: perfiles } = await supabase
    .from("profiles")
    .select("id, nombre, apellido")
    .in("id", profesorIds);

  const sedePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, `${p.nombre} ${p.apellido}`]));
  const cupoPorClase = new Map((cupos ?? []).map((c) => [c.clase_id, c.inscriptos_activos]));
  const miInscripcionPorClase = new Map((misInscripciones ?? []).map((i) => [i.clase_id, i]));

  return clases
    .map((c): ClaseDisponible => {
      const mia = miInscripcionPorClase.get(c.id);
      return {
        id: c.id,
        sedeId: c.sede_id,
        sedeNombre: sedePorId.get(c.sede_id) ?? "?",
        profesorNombre: perfilPorId.get(c.profesor_id) ?? "?",
        diaSemana: c.dia_semana,
        horaInicio: c.hora_inicio,
        horaFin: c.hora_fin,
        cupo: c.cupo,
        inscriptosActivos: cupoPorClase.get(c.id) ?? 0,
        miInscripcionId: mia?.id ?? null,
        miEstado: (mia?.estado as EstadoInscripcion | undefined) ?? null,
      };
    })
    .sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio));
}
