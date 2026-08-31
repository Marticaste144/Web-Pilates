import { createClient } from "@/lib/supabase/server";
import { hoyISO } from "@/lib/fecha";
import { obtenerMaxRecuperacionesPorMes } from "@/lib/configuracion-recuperaciones";

export type TurnoDisponible = {
  id: string;
  claseId: string;
  fecha: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  sedeNombre: string;
  profesorNombre: string;
};

// La RLS ("alumno ve turnos liberados relevantes") ya filtra solo los
// turnos sin tomar de sedes donde la alumna tiene alguna inscripción activa
// -- acá no hace falta repetir ese filtro, solo excluir fechas pasadas (el
// trigger de la base igual rechazaría tomar uno vencido, esto es nada más
// para no mostrar en la lista algo que ya no se puede tomar).
export async function listarTurnosDisponibles(): Promise<TurnoDisponible[]> {
  const supabase = await createClient();
  const hoy = hoyISO();

  const { data: turnos } = await supabase
    .from("turnos_liberados")
    .select("id, clase_id, fecha")
    .is("tomado_por_id", null)
    .gte("fecha", hoy)
    .order("fecha");

  if (!turnos || turnos.length === 0) return [];

  const claseIds = [...new Set(turnos.map((t) => t.clase_id))];
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

  return turnos
    .map((t): TurnoDisponible | null => {
      const clase = clasePorId.get(t.clase_id);
      if (!clase) return null;
      return {
        id: t.id,
        claseId: t.clase_id,
        fecha: t.fecha,
        diaSemana: clase.dia_semana,
        horaInicio: clase.hora_inicio,
        horaFin: clase.hora_fin,
        sedeNombre: sedePorId.get(clase.sede_id) ?? "?",
        profesorNombre: perfilPorId.get(clase.profesor_id) ?? "?",
      };
    })
    .filter((t): t is TurnoDisponible => t !== null)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio));
}

function primerDiaDelMes(fechaISO: string): string {
  return `${fechaISO.slice(0, 7)}-01`;
}

function primerDiaDelMesSiguiente(fechaISO: string): string {
  const [anio, mes] = fechaISO.split("-").map(Number);
  return new Date(Date.UTC(anio, mes, 1)).toISOString().slice(0, 10);
}

export type ResumenRecuperaciones = {
  usadasEsteMes: number;
  maxPorMes: number;
};

export async function obtenerResumenRecuperaciones(): Promise<ResumenRecuperaciones> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const maxPorMes = await obtenerMaxRecuperacionesPorMes();
  if (!user) return { usadasEsteMes: 0, maxPorMes };

  const hoy = hoyISO();
  const { count } = await supabase
    .from("turnos_liberados")
    .select("id", { count: "exact", head: true })
    .eq("tomado_por_id", user.id)
    .gte("fecha", primerDiaDelMes(hoy))
    .lt("fecha", primerDiaDelMesSiguiente(hoy));

  return { usadasEsteMes: count ?? 0, maxPorMes };
}
