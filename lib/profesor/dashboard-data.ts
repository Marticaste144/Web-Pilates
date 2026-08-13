import { createClient } from "@/lib/supabase/server";
import { listarMisClases, type MiClaseItem } from "./clases-data";

export type ProximaClase = {
  sedeNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
};

export type ProfesorMetricas = {
  clasesTotal: number;
  alumnosUnicosTotal: number;
  ocupacionPromedio: number; // 0-100
  proximaClase: ProximaClase | null;
};

// Los horarios son recurrentes semana a semana (mismo criterio que el
// selector de día del alumno, paso 9) -- "próxima clase" busca, para cada
// clase, cuántos días faltan hasta su próxima ocurrencia (hoy mismo si
// todavía no empezó, si no la próxima vez que caiga ese día_semana) y se
// queda con la más cercana. Es una función pura (no pega contra la base)
// para poder probarla con datos sueltos sin necesitar Supabase.
export function calcularProximaClase(clases: MiClaseItem[], ahora: Date = new Date()): MiClaseItem | null {
  if (clases.length === 0) return null;

  const diaHoy = ahora.getDay() === 0 ? 7 : ahora.getDay(); // 1=lunes..7=domingo
  const horaHoy = ahora.toTimeString().slice(0, 8); // "HH:MM:SS", comparable con hora_inicio

  const diasHasta = (c: MiClaseItem): number => {
    let dias = (c.diaSemana - diaHoy + 7) % 7;
    if (dias === 0 && c.horaInicio <= horaHoy) dias = 7; // hoy, pero ya pasó -- la próxima es en una semana
    return dias;
  };

  return [...clases].sort((a, b) => {
    const diff = diasHasta(a) - diasHasta(b);
    return diff !== 0 ? diff : a.horaInicio.localeCompare(b.horaInicio);
  })[0];
}

export async function obtenerMetricasProfesor(): Promise<ProfesorMetricas> {
  const clases = await listarMisClases();

  if (clases.length === 0) {
    return { clasesTotal: 0, alumnosUnicosTotal: 0, ocupacionPromedio: 0, proximaClase: null };
  }

  const supabase = await createClient();
  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("alumno_id")
    .in(
      "clase_id",
      clases.map((c) => c.id),
    )
    .eq("estado", "activa");

  const alumnosUnicosTotal = new Set((inscripciones ?? []).map((i) => i.alumno_id)).size;

  const ocupaciones = clases.map((c) => (c.cupo > 0 ? c.inscriptosActivos / c.cupo : 0));
  const ocupacionPromedio = Math.round((ocupaciones.reduce((a, b) => a + b, 0) / ocupaciones.length) * 100);

  const proxima = calcularProximaClase(clases);

  return {
    clasesTotal: clases.length,
    alumnosUnicosTotal,
    ocupacionPromedio,
    proximaClase: proxima
      ? {
          sedeNombre: proxima.sedeNombre,
          diaSemana: proxima.diaSemana,
          horaInicio: proxima.horaInicio,
          horaFin: proxima.horaFin,
        }
      : null,
  };
}
