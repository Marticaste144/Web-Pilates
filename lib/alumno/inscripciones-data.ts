import { createClient } from "@/lib/supabase/server";
import type { EstadoInscripcion } from "@/types/database";

export type MiInscripcion = {
  id: string;
  claseId: string;
  sedeNombre: string;
  profesorNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  estado: EstadoInscripcion;
  posicionEspera: number | null;
  fechaInscripcion: string;
};

export async function listarMisInscripciones(): Promise<MiInscripcion[]> {
  const supabase = await createClient();

  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("id, clase_id, estado, posicion_espera, fecha_inscripcion")
    .in("estado", ["activa", "lista_espera"]);

  if (!inscripciones || inscripciones.length === 0) return [];

  const claseIds = [...new Set(inscripciones.map((i) => i.clase_id))];
  const { data: clases } = await supabase
    .from("clases")
    .select("id, sede_id, profesor_id, dia_semana, hora_inicio, hora_fin")
    .in("id", claseIds);

  const sedeIds = [...new Set((clases ?? []).map((c) => c.sede_id))];
  const profesorIds = [...new Set((clases ?? []).map((c) => c.profesor_id))];

  const [{ data: sedes }, { data: perfiles }] = await Promise.all([
    supabase.from("sedes").select("id, nombre").in("id", sedeIds),
    supabase.from("profiles").select("id, nombre, apellido").in("id", profesorIds),
  ]);

  const sedePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, `${p.nombre} ${p.apellido}`]));
  const clasePorId = new Map((clases ?? []).map((c) => [c.id, c]));

  return inscripciones
    .map((i): MiInscripcion | null => {
      const clase = clasePorId.get(i.clase_id);
      if (!clase) return null;
      return {
        id: i.id,
        claseId: i.clase_id,
        sedeNombre: sedePorId.get(clase.sede_id) ?? "?",
        profesorNombre: perfilPorId.get(clase.profesor_id) ?? "?",
        diaSemana: clase.dia_semana,
        horaInicio: clase.hora_inicio,
        horaFin: clase.hora_fin,
        estado: i.estado,
        posicionEspera: i.posicion_espera,
        fechaInscripcion: i.fecha_inscripcion,
      };
    })
    .filter((i): i is MiInscripcion => i !== null)
    .sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio));
}
