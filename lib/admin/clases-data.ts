import { createClient } from "@/lib/supabase/server";
import { nombreProfesorClase } from "@/lib/clases-profesor-nombre";
import type { EstadoInscripcion, EstadoVisualCuota, ModalidadClase } from "@/types/database";

export type SedeItem = { id: string; nombre: string };
export type ActividadItem = { id: string; nombre: string };
export type ProfesorSelectItem = { profileId: string; nombre: string; apellido: string; activo: boolean };

export type ClaseListItem = {
  id: string;
  sedeId: string;
  sedeNombre: string;
  profesorId: string | null;
  /** Null = profesor real confirmado pero sin cuenta de acceso todavía. */
  profesorPendienteNombre: string | null;
  profesorNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  cupo: number;
  activa: boolean;
  actividadId: string | null;
  actividadNombre: string | null;
  modalidad: ModalidadClase | null;
};

export async function listarSedes(): Promise<SedeItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("sedes").select("id, nombre").order("nombre");
  return data ?? [];
}

export async function listarActividades(): Promise<ActividadItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("actividades").select("id, nombre").order("nombre");
  return data ?? [];
}

// Qué actividades puede ofrecer cada sede -- se usa para filtrar el
// desplegable de "Actividad" en el formulario según la sede elegida (ej. no
// se puede cargar "Stretching" en MUV PILATES). También es la misma fuente
// de verdad que valida la base (fn_validar_actividad_de_sede).
export async function listarActividadesPorSede(): Promise<Record<string, ActividadItem[]>> {
  const supabase = await createClient();
  const { data: filas } = await supabase.from("sede_actividades").select("sede_id, actividad_id");
  if (!filas || filas.length === 0) return {};

  const actividades = await listarActividades();
  const actividadPorId = new Map(actividades.map((a) => [a.id, a]));

  const porSede: Record<string, ActividadItem[]> = {};
  for (const f of filas) {
    const actividad = actividadPorId.get(f.actividad_id);
    if (!actividad) continue;
    (porSede[f.sede_id] ??= []).push(actividad);
  }
  for (const lista of Object.values(porSede)) {
    lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  return porSede;
}

export async function listarProfesoresParaSelect(): Promise<ProfesorSelectItem[]> {
  const supabase = await createClient();

  const { data: profesores } = await supabase.from("profesores").select("profile_id, activo");
  if (!profesores || profesores.length === 0) return [];

  const ids = profesores.map((p) => p.profile_id);
  const { data: perfiles } = await supabase
    .from("profiles")
    .select("id, nombre, apellido")
    .in("id", ids);

  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, p]));

  return profesores
    .map((p): ProfesorSelectItem | null => {
      const perfil = perfilPorId.get(p.profile_id);
      if (!perfil) return null;
      return { profileId: p.profile_id, nombre: perfil.nombre, apellido: perfil.apellido, activo: p.activo };
    })
    .filter((p): p is ProfesorSelectItem => p !== null)
    .sort((a, b) => a.apellido.localeCompare(b.apellido));
}

function mapearClase(
  c: {
    id: string;
    sede_id: string;
    profesor_id: string | null;
    profesor_pendiente_nombre: string | null;
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    cupo: number;
    activa: boolean;
    actividad_id: string | null;
    modalidad: ModalidadClase | null;
  },
  sedePorId: Map<string, string>,
  profesorPorId: Map<string, string>,
  actividadPorId: Map<string, string>,
): ClaseListItem {
  return {
    id: c.id,
    sedeId: c.sede_id,
    sedeNombre: sedePorId.get(c.sede_id) ?? "?",
    profesorId: c.profesor_id,
    profesorPendienteNombre: c.profesor_pendiente_nombre,
    profesorNombre: nombreProfesorClase(c.profesor_id ? profesorPorId.get(c.profesor_id) : null, c.profesor_pendiente_nombre),
    diaSemana: c.dia_semana,
    horaInicio: c.hora_inicio,
    horaFin: c.hora_fin,
    cupo: c.cupo,
    activa: c.activa,
    actividadId: c.actividad_id,
    actividadNombre: c.actividad_id ? actividadPorId.get(c.actividad_id) ?? "?" : null,
    modalidad: c.modalidad,
  };
}

export async function listarClases(): Promise<ClaseListItem[]> {
  const supabase = await createClient();

  const { data: clases } = await supabase
    .from("clases")
    .select("id, sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo, activa, actividad_id, modalidad");

  if (!clases || clases.length === 0) return [];

  const [{ data: sedes }, { data: actividades }, profesores] = await Promise.all([
    supabase.from("sedes").select("id, nombre"),
    supabase.from("actividades").select("id, nombre"),
    listarProfesoresParaSelect(),
  ]);

  const sedePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  const actividadPorId = new Map((actividades ?? []).map((a) => [a.id, a.nombre]));
  // Admin ve nombre + apellido completo (necesita poder distinguir
  // profesores que compartan nombre de pila) -- distinto del resto de la
  // app, que muestra solo el nombre.
  const profesorPorId = new Map(profesores.map((p) => [p.profileId, `${p.nombre} ${p.apellido}`]));

  return clases
    .map((c) => mapearClase(c, sedePorId, profesorPorId, actividadPorId))
    .sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio));
}

export async function obtenerClase(id: string): Promise<ClaseListItem | null> {
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("clases")
    .select("id, sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo, activa, actividad_id, modalidad")
    .eq("id", id)
    .single();

  if (!c) return null;

  const [{ data: sede }, { data: perfil }, { data: actividad }] = await Promise.all([
    supabase.from("sedes").select("nombre").eq("id", c.sede_id).single(),
    c.profesor_id
      ? supabase.from("profiles").select("nombre, apellido").eq("id", c.profesor_id).single()
      : Promise.resolve({ data: null as { nombre: string; apellido: string } | null }),
    c.actividad_id ? supabase.from("actividades").select("nombre").eq("id", c.actividad_id).single() : Promise.resolve({ data: null }),
  ]);

  return {
    id: c.id,
    sedeId: c.sede_id,
    sedeNombre: sede?.nombre ?? "?",
    profesorId: c.profesor_id,
    profesorPendienteNombre: c.profesor_pendiente_nombre,
    profesorNombre: nombreProfesorClase(perfil ? `${perfil.nombre} ${perfil.apellido}` : null, c.profesor_pendiente_nombre),
    diaSemana: c.dia_semana,
    horaInicio: c.hora_inicio,
    horaFin: c.hora_fin,
    cupo: c.cupo,
    activa: c.activa,
    actividadId: c.actividad_id,
    actividadNombre: actividad?.nombre ?? null,
    modalidad: c.modalidad,
  };
}

// Todas las clases de un profesor (activas o no), con sede/actividad/día/
// horario -- pensado para /admin/profesores/[id] ("ver sus clases/días/
// horarios" y "ver las sedes/actividades donde trabaja").
export async function listarClasesDeProfesor(profesorId: string): Promise<ClaseListItem[]> {
  const supabase = await createClient();

  const { data: clases } = await supabase
    .from("clases")
    .select("id, sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo, activa, actividad_id, modalidad")
    .eq("profesor_id", profesorId);

  if (!clases || clases.length === 0) return [];

  const [{ data: sedes }, { data: actividades }] = await Promise.all([
    supabase.from("sedes").select("id, nombre"),
    supabase.from("actividades").select("id, nombre"),
  ]);

  const sedePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  const actividadPorId = new Map((actividades ?? []).map((a) => [a.id, a.nombre]));
  const profesorPorId = new Map<string, string>(); // no hace falta acá, el nombre ya se conoce afuera

  return clases
    .map((c) => mapearClase(c, sedePorId, profesorPorId, actividadPorId))
    .sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio));
}

export type InscriptoClaseItem = {
  alumnoId: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  estado: EstadoInscripcion;
  posicionEspera: number | null;
  cuotaEstado: EstadoVisualCuota | "sin_pagos";
};

// A diferencia del roster del profesor, acá se ven TODOS los anotados (sin
// la restricción de "invisible hasta la primera cuota aprobada" -- esa
// regla es específica de la visibilidad del profesor, no aplica a la
// admin) y también los de lista de espera, no solo los activos.
export async function listarInscriptosDeClase(
  claseId: string,
  sedeId: string,
): Promise<InscriptoClaseItem[]> {
  const supabase = await createClient();

  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("alumno_id, estado, posicion_espera")
    .eq("clase_id", claseId)
    .in("estado", ["activa", "lista_espera"]);

  if (!inscripciones || inscripciones.length === 0) return [];

  const alumnoIds = [...new Set(inscripciones.map((i) => i.alumno_id))];
  const [{ data: perfiles }, { data: cuotas }] = await Promise.all([
    supabase.from("profiles").select("id, nombre, apellido, email, telefono").in("id", alumnoIds),
    supabase
      .from("v_estado_cuota_alumno_sede")
      .select("alumno_id, estado_visual")
      .eq("sede_id", sedeId)
      .in("alumno_id", alumnoIds),
  ]);

  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, p]));
  const cuotaPorAlumno = new Map((cuotas ?? []).map((c) => [c.alumno_id, c.estado_visual]));

  return inscripciones
    .map((i): InscriptoClaseItem | null => {
      const perfil = perfilPorId.get(i.alumno_id);
      if (!perfil) return null;
      return {
        alumnoId: i.alumno_id,
        nombre: perfil.nombre,
        apellido: perfil.apellido,
        email: perfil.email,
        telefono: perfil.telefono,
        estado: i.estado,
        posicionEspera: i.posicion_espera,
        cuotaEstado: cuotaPorAlumno.get(i.alumno_id) ?? "sin_pagos",
      };
    })
    .filter((x): x is InscriptoClaseItem => x !== null)
    .sort((a, b) => {
      if (a.estado !== b.estado) return a.estado === "activa" ? -1 : 1;
      return (a.posicionEspera ?? 0) - (b.posicionEspera ?? 0);
    });
}
