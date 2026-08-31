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

// Fila de la lista de asistencia de una sesión puntual: o llegó por
// confirmación propia de la alumna, o la agregó el profesor a mano (ya sea
// una alumna de su propia clase que se olvidó de confirmar, o alguien de
// recuperación que no pertenece a esta clase/sede -- ver no_registrado).
export type AlumnoConfirmadoItem = {
  asistenciaId: string;
  alumnoId: string | null;
  nombre: string;
  apellido: string;
  telefono: string | null;
  cuotaEstado: EstadoVisualCuota | "sin_pagos";
  asistenciaEstado: EstadoAsistencia | null;
  confirmado: boolean;
  esRecuperacion: boolean;
  agregadoManualmente: boolean;
  noRegistrado: boolean;
  manualSedeHabitual: string | null;
  manualProfesorHabitual: string | null;
};

// Alumna inscripta en esta clase (con cuota aprobada, o sea "visible" para el
// profesor) que todavía NO tiene fila en la lista de arriba -- son las que
// aparecen en el desplegable de "agregar a alguien que no confirmó".
export type AlumnoDisponibleItem = {
  alumnoId: string;
  nombre: string;
  apellido: string;
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
  confirmados: AlumnoConfirmadoItem[];
  disponibles: AlumnoDisponibleItem[];
  alumnosNoVisibles: number;
};

// Un alumno inscripto puede no aparecer como "disponible" ni "confirmado" si
// todavía no tuvo ninguna cuota aprobada -- por RLS el profesor puede ver que
// existe la inscripción (para el conteo de cupo) pero no puede resolver su
// perfil/nombre hasta ese momento (regla de negocio de la sección 2).
//
// `fecha` es opcional: sin ?fecha= en la URL, se resuelve acá (no en el
// caller) a la última ocurrencia real del día que dicta la clase -- ver
// fechaUltimaOcurrencia. El valor final queda en ClaseDetalle.fecha para que
// page.tsx y los endpoints de exportación usen siempre la misma fecha resuelta.
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

  const [{ data: inscripciones }, { data: asistencias }] = await Promise.all([
    supabase.from("inscripciones").select("alumno_id").eq("clase_id", claseId).eq("estado", "activa"),
    supabase
      .from("asistencias")
      .select(
        "id, alumno_id, estado, confirmado, es_recuperacion, agregado_manualmente, no_registrado, manual_nombre, manual_apellido, manual_sede_habitual, manual_profesor_habitual",
      )
      .eq("clase_id", claseId)
      .eq("fecha", fechaResuelta),
  ]);

  const rosterIds = [...new Set((inscripciones ?? []).map((i) => i.alumno_id))];
  const totalInscriptos = rosterIds.length;
  const filasAsistencia = asistencias ?? [];

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

  const alumnoIdsConFila = new Set(filasAsistencia.map((a) => a.alumno_id).filter((id): id is string => id !== null));
  const idsAResolver = [...new Set([...rosterIds, ...alumnoIdsConFila])];

  if (idsAResolver.length === 0 && filasAsistencia.length === 0) {
    return { ...base, confirmados: [], disponibles: [], alumnosNoVisibles: 0 };
  }

  const [{ data: perfiles }, { data: cuotas }] = await Promise.all([
    idsAResolver.length > 0
      ? supabase.from("profiles").select("id, nombre, apellido, telefono").in("id", idsAResolver)
      : Promise.resolve({ data: [] as { id: string; nombre: string; apellido: string; telefono: string | null }[] }),
    supabase.from("v_estado_cuota_alumno_sede").select("alumno_id, estado_visual").eq("sede_id", clase.sede_id),
  ]);

  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, p]));
  const cuotaPorAlumno = new Map((cuotas ?? []).map((c) => [c.alumno_id, c.estado_visual]));
  const rosterVisibleIds = rosterIds.filter((id) => perfilPorId.has(id));

  const confirmados: AlumnoConfirmadoItem[] = filasAsistencia
    .map((a): AlumnoConfirmadoItem => {
      if (a.no_registrado) {
        return {
          asistenciaId: a.id,
          alumnoId: null,
          nombre: a.manual_nombre ?? "?",
          apellido: a.manual_apellido ?? "?",
          telefono: null,
          cuotaEstado: "sin_pagos",
          asistenciaEstado: a.estado,
          confirmado: a.confirmado,
          esRecuperacion: a.es_recuperacion,
          agregadoManualmente: a.agregado_manualmente,
          noRegistrado: true,
          manualSedeHabitual: a.manual_sede_habitual,
          manualProfesorHabitual: a.manual_profesor_habitual,
        };
      }

      const perfil = a.alumno_id ? perfilPorId.get(a.alumno_id) : undefined;
      return {
        asistenciaId: a.id,
        alumnoId: a.alumno_id,
        nombre: perfil?.nombre ?? "?",
        apellido: perfil?.apellido ?? "?",
        telefono: perfil?.telefono ?? null,
        cuotaEstado: (a.alumno_id ? cuotaPorAlumno.get(a.alumno_id) : undefined) ?? "sin_pagos",
        asistenciaEstado: a.estado,
        confirmado: a.confirmado,
        esRecuperacion: a.es_recuperacion,
        agregadoManualmente: a.agregado_manualmente,
        noRegistrado: false,
        manualSedeHabitual: null,
        manualProfesorHabitual: null,
      };
    })
    .sort((a, b) => a.apellido.localeCompare(b.apellido));

  const disponibles: AlumnoDisponibleItem[] = rosterVisibleIds
    .filter((id) => !alumnoIdsConFila.has(id))
    .map((id): AlumnoDisponibleItem => {
      const perfil = perfilPorId.get(id)!;
      return { alumnoId: id, nombre: perfil.nombre, apellido: perfil.apellido };
    })
    .sort((a, b) => a.apellido.localeCompare(b.apellido));

  return {
    ...base,
    confirmados,
    disponibles,
    alumnosNoVisibles: totalInscriptos - rosterVisibleIds.length,
  };
}
