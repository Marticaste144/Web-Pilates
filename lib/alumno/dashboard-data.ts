import { listarMisInscripciones } from "./inscripciones-data";
import { listarEstadoCuotaAlumno, type CuotaSedeItem } from "./cuota-data";
import { calcularProximaOcurrencia } from "@/lib/proxima-ocurrencia";
import type { EstadoInscripcion } from "@/types/database";

export type ProximaClaseAlumno = {
  claseId: string;
  sedeNombre: string;
  profesorNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  estado: EstadoInscripcion;
};

export type AlumnoMetricas = {
  proximaClase: ProximaClaseAlumno | null;
  clasesActivasTotal: number;
  listaEsperaTotal: number;
  sedesTotal: number;
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
          claseId: proxima.claseId,
          sedeNombre: proxima.sedeNombre,
          profesorNombre: proxima.profesorNombre,
          diaSemana: proxima.diaSemana,
          horaInicio: proxima.horaInicio,
          horaFin: proxima.horaFin,
          estado: proxima.estado,
        }
      : null,
    clasesActivasTotal: activas.length,
    listaEsperaTotal: inscripciones.length - activas.length,
    // listarEstadoCuotaAlumno ya devuelve una fila por cada sede donde el
    // alumno tiene alguna inscripción (activa o en espera) -- su longitud
    // ES la cantidad de sedes distintas, sin necesidad de otra consulta.
    sedesTotal: cuotas.length,
    cuotas,
  };
}
