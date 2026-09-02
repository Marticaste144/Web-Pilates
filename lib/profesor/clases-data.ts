import { createClient } from "@/lib/supabase/server";
import { fechaUltimaOcurrencia } from "@/lib/dias-semana";
import type { EstadoAsistencia, EstadoVisualCuota, ModalidadClase } from "@/types/database";

export type MiClaseItem = {
  id: string;
  sedeNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  cupo: number;
  inscriptosActivos: number;
  /** Null en clases viejas todavía sin categorizar (ver migración 20260901160000). */
  actividadNombre: string | null;
  modalidad: ModalidadClase | null;
};

export async function listarMisClases(): Promise<MiClaseItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: clases } = await supabase
    .from("clases")
    .select("id, sede_id, dia_semana, hora_inicio, hora_fin, cupo, actividad_id, modalidad")
    .eq("profesor_id", user.id)
    .eq("activa", true);

  if (!clases || clases.length === 0) return [];

  const [{ data: sedes }, { data: actividades }, { data: cupos }] = await Promise.all([
    supabase.from("sedes").select("id, nombre"),
    supabase.from("actividades").select("id, nombre"),
    supabase.from("v_cupo_clases").select("clase_id, inscriptos_activos"),
  ]);

  const sedePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  const actividadPorId = new Map((actividades ?? []).map((a) => [a.id, a.nombre]));
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
      actividadNombre: c.actividad_id ? actividadPorId.get(c.actividad_id) ?? null : null,
      modalidad: c.modalidad,
    }))
    .sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio));
}

// Fila de la lista de asistencia de una sesión puntual: o es una alumna
// inscripta en la clase (asistenciaId null = todavía no se marcó nada ese
// día -- marcar Presente/Ausente crea la fila sola, no hace falta un paso
// previo de "agregarla"), o es alguien agregado a mano que NO pertenece a
// esta clase/sede (noRegistrado = true, sin alumnoId).
export type AlumnoAsistenciaItem = {
  asistenciaId: string | null;
  alumnoId: string | null;
  nombre: string;
  apellido: string;
  telefono: string | null;
  cuotaEstado: EstadoVisualCuota | "sin_pagos";
  asistenciaEstado: EstadoAsistencia | null;
  noRegistrado: boolean;
  manualSedeHabitual: string | null;
  manualProfesorHabitual: string | null;
};

export type ClaseDetalle = {
  id: string;
  profesorId: string;
  sedeId: string;
  sedeNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  cupo: number;
  totalInscriptos: number;
  fecha: string;
  actividadNombre: string | null;
  modalidad: ModalidadClase | null;
  roster: AlumnoAsistenciaItem[];
  alumnosNoVisibles: number;
};

// Un alumno inscripto puede no aparecer en el roster si todavía no tuvo
// ninguna cuota aprobada -- por RLS el profesor puede ver que existe la
// inscripción (para el conteo de cupo) pero no puede resolver su perfil/
// nombre hasta ese momento (regla de negocio de la sección 2).
//
// `fecha` es opcional: sin ?fecha= en la URL, se resuelve acá (no en el
// caller) a la última ocurrencia real del día que dicta la clase -- ver
// fechaUltimaOcurrencia. El valor final queda en ClaseDetalle.fecha para que
// page.tsx y los endpoints de exportación usen siempre la misma fecha resuelta.
export async function obtenerClaseDetalle(claseId: string, fecha?: string): Promise<ClaseDetalle | null> {
  const supabase = await createClient();

  const { data: clase } = await supabase
    .from("clases")
    .select("id, profesor_id, sede_id, dia_semana, hora_inicio, hora_fin, cupo, actividad_id, modalidad")
    .eq("id", claseId)
    .single();

  if (!clase) return null;

  const fechaResuelta = fecha || fechaUltimaOcurrencia(clase.dia_semana);

  const [{ data: sede }, { data: actividad }] = await Promise.all([
    supabase.from("sedes").select("nombre").eq("id", clase.sede_id).single(),
    clase.actividad_id
      ? supabase.from("actividades").select("nombre").eq("id", clase.actividad_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const [{ data: inscripciones }, { data: asistencias }] = await Promise.all([
    supabase.from("inscripciones").select("alumno_id").eq("clase_id", claseId).eq("estado", "activa"),
    supabase
      .from("asistencias")
      .select("id, alumno_id, estado, no_registrado, manual_nombre, manual_apellido, manual_sede_habitual, manual_profesor_habitual")
      .eq("clase_id", claseId)
      .eq("fecha", fechaResuelta),
  ]);

  const rosterIds = [...new Set((inscripciones ?? []).map((i) => i.alumno_id))];
  const totalInscriptos = rosterIds.length;
  const filasAsistencia = asistencias ?? [];

  const base = {
    id: clase.id,
    profesorId: clase.profesor_id,
    sedeId: clase.sede_id,
    sedeNombre: sede?.nombre ?? "?",
    diaSemana: clase.dia_semana,
    horaInicio: clase.hora_inicio,
    horaFin: clase.hora_fin,
    cupo: clase.cupo,
    totalInscriptos,
    fecha: fechaResuelta,
    actividadNombre: actividad?.nombre ?? null,
    modalidad: clase.modalidad,
  };

  const noRegistradosRaw = filasAsistencia.filter((a) => a.no_registrado);
  const asistenciaPorAlumno = new Map(
    filasAsistencia.filter((a): a is typeof a & { alumno_id: string } => a.alumno_id !== null).map((a) => [a.alumno_id, a]),
  );

  if (rosterIds.length === 0 && noRegistradosRaw.length === 0) {
    return { ...base, roster: [], alumnosNoVisibles: 0 };
  }

  const [{ data: perfiles }, { data: cuotas }] = await Promise.all([
    rosterIds.length > 0
      ? supabase.from("profiles").select("id, nombre, apellido, telefono").in("id", rosterIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string; apellido: string; telefono: string | null }[] }),
    supabase.from("v_estado_cuota_alumno_sede").select("alumno_id, estado_visual").eq("sede_id", clase.sede_id),
  ]);

  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, p]));
  const cuotaPorAlumno = new Map((cuotas ?? []).map((c) => [c.alumno_id, c.estado_visual]));
  const rosterVisibleIds = rosterIds.filter((id) => perfilPorId.has(id));

  const rosterItems: AlumnoAsistenciaItem[] = rosterVisibleIds
    .map((id): AlumnoAsistenciaItem => {
      const perfil = perfilPorId.get(id)!;
      const a = asistenciaPorAlumno.get(id);
      return {
        asistenciaId: a?.id ?? null,
        alumnoId: id,
        nombre: perfil.nombre,
        apellido: perfil.apellido,
        telefono: perfil.telefono,
        cuotaEstado: cuotaPorAlumno.get(id) ?? "sin_pagos",
        asistenciaEstado: a?.estado ?? null,
        noRegistrado: false,
        manualSedeHabitual: null,
        manualProfesorHabitual: null,
      };
    })
    .sort((a, b) => a.apellido.localeCompare(b.apellido));

  const noRegistradosItems: AlumnoAsistenciaItem[] = noRegistradosRaw
    .map((a): AlumnoAsistenciaItem => ({
      asistenciaId: a.id,
      alumnoId: null,
      nombre: a.manual_nombre ?? "?",
      apellido: a.manual_apellido ?? "?",
      telefono: null,
      cuotaEstado: "sin_pagos",
      asistenciaEstado: a.estado,
      noRegistrado: true,
      manualSedeHabitual: a.manual_sede_habitual,
      manualProfesorHabitual: a.manual_profesor_habitual,
    }))
    .sort((a, b) => a.apellido.localeCompare(b.apellido));

  return {
    ...base,
    roster: [...rosterItems, ...noRegistradosItems],
    alumnosNoVisibles: totalInscriptos - rosterVisibleIds.length,
  };
}
