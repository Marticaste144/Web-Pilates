import { createClient } from "@/lib/supabase/server";
import { listarMisClases, type MiClaseItem } from "./clases-data";
import { calcularProximaOcurrencia } from "@/lib/proxima-ocurrencia";
import { hoyISO } from "@/lib/fecha";

export type ResumenDiaProfesor = {
  clasesHoy: MiClaseItem[];
  proximaClase: MiClaseItem | null;
  alumnasTotal: number;
  ocupacionPromedio: number; // 0-100
  asistenciasHoy: number;
};

// Mismo criterio de "día de hoy" (1=lunes..7=domingo, getDay() local) que usa
// calcularProximaOcurrencia -- así "próxima clase" y "clases de hoy"
// coinciden sobre qué día es hoy.
function diaSemanaActual(ahora: Date = new Date()): number {
  return ahora.getDay() === 0 ? 7 : ahora.getDay();
}

// Todo lo que necesita el resumen de Inicio del profesor, a partir de
// listarMisClases() (ya filtra por profesor_id vía auth) -- una sola fuente
// de clases para próxima clase, clases de hoy, ocupación y asistencias.
export async function obtenerResumenDiaProfesor(): Promise<ResumenDiaProfesor> {
  const clases = await listarMisClases();

  if (clases.length === 0) {
    return { clasesHoy: [], proximaClase: null, alumnasTotal: 0, ocupacionPromedio: 0, asistenciasHoy: 0 };
  }

  const diaHoy = diaSemanaActual();
  const clasesHoy = clases
    .filter((c) => c.diaSemana === diaHoy)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  const proximaClase = calcularProximaOcurrencia(clases);

  const supabase = await createClient();

  // "Alumnas totales": alumnas únicas entre TODAS las clases del profesor,
  // no solo las de hoy -- una alumna anotada en más de una clase cuenta una
  // sola vez.
  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("alumno_id")
    .in(
      "clase_id",
      clases.map((c) => c.id),
    )
    .eq("estado", "activa");
  const alumnasTotal = new Set((inscripciones ?? []).map((i) => i.alumno_id)).size;

  const ocupaciones = clases.map((c) => (c.cupo > 0 ? c.inscriptosActivos / c.cupo : 0));
  const ocupacionPromedio = Math.round((ocupaciones.reduce((a, b) => a + b, 0) / ocupaciones.length) * 100);

  // "Asistencias hoy": cuántas asistencias (presente o ausente) ya se
  // tomaron hoy en las clases de hoy -- hoyISO() usa horario argentino, no
  // el huso del server, mismo criterio que el resto de la app.
  let asistenciasHoy = 0;
  if (clasesHoy.length > 0) {
    const { data: asistencias } = await supabase
      .from("asistencias")
      .select("id")
      .in(
        "clase_id",
        clasesHoy.map((c) => c.id),
      )
      .eq("fecha", hoyISO());
    asistenciasHoy = asistencias?.length ?? 0;
  }

  return { clasesHoy, proximaClase, alumnasTotal, ocupacionPromedio, asistenciasHoy };
}
