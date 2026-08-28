import { createClient } from "@/lib/supabase/server";
import { listarMisClases, type MiClaseItem } from "./clases-data";
import { calcularProximaOcurrencia } from "@/lib/proxima-ocurrencia";

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

// Wrapper con el nombre de siempre -- la lógica en sí (pura, ya probada con
// 6 casos sueltos) ahora vive en lib/proxima-ocurrencia.ts, compartida con
// el cálculo análogo de la home del alumno (paso 13).
function calcularProximaClase(clases: MiClaseItem[], ahora: Date = new Date()): MiClaseItem | null {
  return calcularProximaOcurrencia(clases, ahora);
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
