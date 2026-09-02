import { listarMisClases, obtenerClaseDetalle } from "./clases-data";
import { getCurrentProfile } from "@/lib/auth/session";
import type { EstadoAsistencia } from "@/types/database";

export type AsistenciaSemanaClase = {
  claseId: string;
  sedeNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  fecha: string; // fecha calendario exacta de la ocurrencia de esta clase esa semana
  alumnos: { nombre: string; apellido: string; estado: EstadoAsistencia | null }[];
};

export type AsistenciasSemana = {
  profesorNombre: string;
  lunes: string;
  domingo: string;
  clases: AsistenciaSemanaClase[];
};

// Lunes (ISO) de la semana que contiene fechaISO -- mismo criterio 1=lunes
// que dia_semana en toda la app (lib/dias-semana.ts).
function lunesDeLaSemana(fechaISO: string): Date {
  const d = new Date(`${fechaISO}T00:00:00`);
  const diaISO = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (diaISO - 1));
  return d;
}

function sumarDias(fecha: Date, dias: number): Date {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

function aISO(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

// Cada clase del profesor ocurre exactamente una vez en la semana (es
// recurrente por dia_semana) -- se calcula esa fecha exacta y se reusa
// obtenerClaseDetalle (ya probado, mismo que usa /profesor/clases/[id])
// para traer el roster + asistencia de esa ocurrencia puntual, con la MISMA
// regla de visibilidad de siempre (alumno sin cuota aprobada no aparece).
export async function obtenerAsistenciasSemana(fechaReferencia: string): Promise<AsistenciasSemana> {
  const [perfil, clases] = await Promise.all([getCurrentProfile(), listarMisClases()]);

  const lunes = lunesDeLaSemana(fechaReferencia);

  const detalle = await Promise.all(
    clases.map(async (c): Promise<AsistenciaSemanaClase> => {
      const fecha = aISO(sumarDias(lunes, c.diaSemana - 1));
      const claseDetalle = await obtenerClaseDetalle(c.id, fecha);
      return {
        claseId: c.id,
        sedeNombre: c.sedeNombre,
        diaSemana: c.diaSemana,
        horaInicio: c.horaInicio,
        horaFin: c.horaFin,
        fecha,
        alumnos: (claseDetalle?.roster ?? []).map((a) => ({
          nombre: a.nombre,
          apellido: a.apellido,
          estado: a.asistenciaEstado,
        })),
      };
    }),
  );

  detalle.sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio));

  return {
    profesorNombre: perfil ? `${perfil.nombre} ${perfil.apellido}` : "?",
    lunes: aISO(lunes),
    domingo: aISO(sumarDias(lunes, 6)),
    clases: detalle,
  };
}
