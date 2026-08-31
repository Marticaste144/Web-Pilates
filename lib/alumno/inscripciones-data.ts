import { createClient } from "@/lib/supabase/server";
import { hoyISO, diaSemanaHoy, horaAhoraISO } from "@/lib/fecha";
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
  // Confirmación de asistencia de HOY (solo tiene sentido si diaSemana es
  // el día de hoy) -- ver estaEnVentanaConfirmacion.
  esHoy: boolean;
  fechaHoy: string | null;
  ventanaConfirmacionAbierta: boolean;
  yaConfirmoHoy: boolean;
};

function aSegundosDelDia(hora: string): number {
  const [h, m, s] = hora.split(":").map(Number);
  return h * 3600 + m * 60 + (s ?? 0);
}

// Se habilita 1hs antes del inicio de la clase y se cierra cuando termina --
// mismo criterio que el trigger fn_validar_ventana_confirmacion_asistencia
// (base de datos), repetido acá solo para no mostrarle a la alumna un botón
// habilitado que el server igual va a rechazar.
function estaEnVentanaConfirmacion(horaInicio: string, horaFin: string, horaAhora: string): boolean {
  const inicio = Math.max(aSegundosDelDia(horaInicio) - 3600, 0);
  const fin = aSegundosDelDia(horaFin);
  const ahora = aSegundosDelDia(horaAhora);
  return ahora >= inicio && ahora <= fin;
}

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

  const diaHoy = diaSemanaHoy();
  const fechaHoy = hoyISO();
  const horaAhora = horaAhoraISO();
  const claseIdsDeHoy = [...clasePorId.values()].filter((c) => c.dia_semana === diaHoy).map((c) => c.id);

  // Solo se necesita saber "¿ya confirmé HOY?" para las clases que dictan hoy
  // -- el resto de los días no tiene botón de confirmar, así que no hace
  // falta traer su historial de asistencias acá.
  const confirmadasHoy = new Set<string>();
  if (claseIdsDeHoy.length > 0) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: asistenciasHoy } = await supabase
        .from("asistencias")
        .select("clase_id")
        .eq("alumno_id", user.id)
        .eq("fecha", fechaHoy)
        .eq("confirmado", true)
        .in("clase_id", claseIdsDeHoy);
      for (const a of asistenciasHoy ?? []) confirmadasHoy.add(a.clase_id);
    }
  }

  return inscripciones
    .map((i): MiInscripcion | null => {
      const clase = clasePorId.get(i.clase_id);
      if (!clase) return null;
      const esHoy = clase.dia_semana === diaHoy;
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
        esHoy,
        fechaHoy: esHoy ? fechaHoy : null,
        ventanaConfirmacionAbierta: esHoy && estaEnVentanaConfirmacion(clase.hora_inicio, clase.hora_fin, horaAhora),
        yaConfirmoHoy: esHoy && confirmadasHoy.has(i.clase_id),
      };
    })
    .filter((i): i is MiInscripcion => i !== null)
    .sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio));
}
