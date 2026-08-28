import { createClient } from "@/lib/supabase/server";
import { fechaUltimaOcurrencia } from "@/lib/dias-semana";
import type { EstadoAsistencia, EstadoVisualCuota } from "@/types/database";

export type MiClaseItem = {
  id: string;
  sedeNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  cupo: number;
  inscriptosActivos: number;
};

export async function listarMisClases(): Promise<MiClaseItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: clases } = await supabase
    .from("clases")
    .select("id, sede_id, dia_semana, hora_inicio, hora_fin, cupo")
    .eq("profesor_id", user.id)
    .eq("activa", true);

  if (!clases || clases.length === 0) return [];

  const [{ data: sedes }, { data: cupos }] = await Promise.all([
    supabase.from("sedes").select("id, nombre"),
    supabase.from("v_cupo_clases").select("clase_id, inscriptos_activos"),
  ]);

  const sedePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  const cupoPorClase = new Map((cupos ?? []).map((c) => [c.clase_id, c.inscriptos_activos]));

  return clases
    .map((c): MiClaseItem => ({
      id: c.id,
      sedeNombre: sedePorId.get(c.sede_id) ?? "?",
      diaSemana: c.dia_semana,
      horaInicio: c.hora_inicio,
      horaFin: c.hora_fin,
      cupo: c.cupo,
      inscriptosActivos: cupoPorClase.get(c.id) ?? 0,
    }))
    .sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio));
}

export type AlumnoRosterItem = {
  alumnoId: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  cuotaEstado: EstadoVisualCuota | "sin_pagos";
  asistenciaEstado: EstadoAsistencia | null;
};

export type ClaseDetalle = {
  id: string;
  sedeId: string;
  sedeNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  cupo: number;
  totalInscriptos: number;
  fecha: string;
  alumnosVisibles: AlumnoRosterItem[];
  alumnosNoVisibles: number;
};

// Un alumno inscripto puede no aparecer en "alumnosVisibles" si todavía no
// tuvo ninguna cuota aprobada -- por RLS el profesor puede ver que existe
// la inscripción (para el conteo de cupo) pero no puede resolver su
// perfil/nombre hasta ese momento (regla de negocio de la sección 2).
//
// `fecha` es opcional: sin ?fecha= en la URL, se resuelve acá (no en el
// caller) a la última ocurrencia real del día que dicta la clase -- ver
// fechaUltimaOcurrencia. El valor final queda en ClaseDetalle.fecha para que
// page.tsx y el endpoint de PDF usen siempre la misma fecha resuelta.
export async function obtenerClaseDetalle(claseId: string, fecha?: string): Promise<ClaseDetalle | null> {
  const supabase = await createClient();

  const { data: clase } = await supabase
    .from("clases")
    .select("id, sede_id, dia_semana, hora_inicio, hora_fin, cupo")
    .eq("id", claseId)
    .single();

  if (!clase) return null;

  const fechaResuelta = fecha || fechaUltimaOcurrencia(clase.dia_semana);

  const { data: sede } = await supabase.from("sedes").select("nombre").eq("id", clase.sede_id).single();

  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("alumno_id")
    .eq("clase_id", claseId)
    .eq("estado", "activa");

  const alumnoIds = [...new Set((inscripciones ?? []).map((i) => i.alumno_id))];
  const totalInscriptos = alumnoIds.length;

  const base = {
    id: clase.id,
    sedeId: clase.sede_id,
    sedeNombre: sede?.nombre ?? "?",
    diaSemana: clase.dia_semana,
    horaInicio: clase.hora_inicio,
    horaFin: clase.hora_fin,
    cupo: clase.cupo,
    totalInscriptos,
    fecha: fechaResuelta,
  };

  if (alumnoIds.length === 0) {
    return { ...base, alumnosVisibles: [], alumnosNoVisibles: 0 };
  }

  const [{ data: perfiles }, { data: cuotas }, { data: asistencias }] = await Promise.all([
    supabase.from("profiles").select("id, nombre, apellido, telefono").in("id", alumnoIds),
    supabase
      .from("v_estado_cuota_alumno_sede")
      .select("alumno_id, estado_visual")
      .eq("sede_id", clase.sede_id),
    supabase.from("asistencias").select("alumno_id, estado").eq("clase_id", claseId).eq("fecha", fechaResuelta),
  ]);

  const cuotaPorAlumno = new Map((cuotas ?? []).map((c) => [c.alumno_id, c.estado_visual]));
  const asistenciaPorAlumno = new Map((asistencias ?? []).map((a) => [a.alumno_id, a.estado]));

  const visibles: AlumnoRosterItem[] = (perfiles ?? [])
    .map((p): AlumnoRosterItem => ({
      alumnoId: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      telefono: p.telefono,
      cuotaEstado: cuotaPorAlumno.get(p.id) ?? "sin_pagos",
      asistenciaEstado: asistenciaPorAlumno.get(p.id) ?? null,
    }))
    .sort((a, b) => a.apellido.localeCompare(b.apellido));

  return {
    ...base,
    alumnosVisibles: visibles,
    alumnosNoVisibles: totalInscriptos - visibles.length,
  };
}
