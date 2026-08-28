import { listarMisInscripciones } from "./inscripciones-data";
import { listarEstadoCuotaAlumno, type CuotaSedeItem } from "./cuota-data";
import { calcularProximaOcurrencia } from "@/lib/proxima-ocurrencia";

export type ProximaClaseAlumno = {
  sedeNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
};

export type AlumnoMetricas = {
  proximaClase: ProximaClaseAlumno | null;
  clasesActivasTotal: number;
  listaEsperaTotal: number;
  cuotas: CuotaSedeItem[];
};

// Reusa listarMisInscripciones (ya filtra por alumno vía RLS) y
// listarEstadoCuotaAlumno (ya existían, para /alumno/inscripciones y
// /alumno/cuota) -- acá solo se agregan/resumen, no se duplica ninguna
// consulta nueva contra pagos/inscripciones.
export async function obtenerMetricasAlumno(): Promise<AlumnoMetricas> {
  const [inscripciones, cuotas] = await Promise.all([listarMisInscripciones(), listarEstadoCuotaAlumno()]);

  // Solo las activas cuentan como "próxima clase" -- estar en lista de
  // espera no es todavía un lugar confirmado al que ir.
  const activas = inscripciones.filter((i) => i.estado === "activa");
  const proxima = calcularProximaOcurrencia(activas);

  return {
    proximaClase: proxima
      ? {
          sedeNombre: proxima.sedeNombre,
          diaSemana: proxima.diaSemana,
          horaInicio: proxima.horaInicio,
          horaFin: proxima.horaFin,
        }
      : null,
    clasesActivasTotal: activas.length,
    listaEsperaTotal: inscripciones.length - activas.length,
    cuotas,
  };
}
