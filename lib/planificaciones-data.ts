import { createClient } from "@/lib/supabase/server";
import type { TipoPlanificacion } from "@/types/database";

// Compartido entre /admin/alumnos/[id]/planificacion, /profesor/alumnas/[id]/planificacion
// (individual) y las páginas de clase grupal -- la RLS (migración
// 20260902090000_planificaciones.sql) ya resuelve sola quién puede ver/tocar
// cada planificación según el rol; estas funciones solo devuelven lo que la
// base deje pasar.

export type SemanaEjercicio = {
  id: string;
  numeroSemana: number;
  carga: string | null;
  series: string | null;
  repeticiones: string | null;
  tiempo: string | null;
  pse: string | null;
  observaciones: string | null;
};

export type EjercicioPlanificacion = {
  id: string;
  nombre: string;
  orden: number;
  semanas: SemanaEjercicio[];
};

export type BloquePlanificacion = {
  id: string;
  nombre: string;
  orden: number;
  ejercicios: EjercicioPlanificacion[];
};

export type DiaPlanificacion = {
  id: string;
  nombre: string;
  estiramientos: string | null;
  orden: number;
  bloques: BloquePlanificacion[];
};

export type PlanificacionResumen = {
  id: string;
  tipo: TipoPlanificacion;
  alumnoId: string | null;
  claseId: string | null;
  esActual: boolean;
  version: number;
  versionAnteriorId: string | null;
  titulo: string | null;
  objetivoGeneral: string | null;
  observaciones: string | null;
  creadoPorNombre: string;
  createdAt: string;
  updatedAt: string;
};

export type PlanificacionCompleta = PlanificacionResumen & {
  dias: DiaPlanificacion[];
  /** Mayor número de semana usado por cualquier ejercicio -- mínimo 4 (default habitual) aunque todavía no se haya cargado ninguna. */
  maxSemana: number;
};

const SEMANA_DEFAULT_MINIMA = 4;

async function nombreDe(supabase: Awaited<ReturnType<typeof createClient>>, profileId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("nombre, apellido").eq("id", profileId).maybeSingle();
  return data ? `${data.nombre} ${data.apellido}` : "?";
}

function aResumen(
  p: {
    id: string;
    tipo: TipoPlanificacion;
    alumno_id: string | null;
    clase_id: string | null;
    es_actual: boolean;
    version: number;
    version_anterior_id: string | null;
    titulo: string | null;
    objetivo_general: string | null;
    observaciones: string | null;
    creado_por: string;
    created_at: string;
    updated_at: string;
  },
  creadoPorNombre: string,
): PlanificacionResumen {
  return {
    id: p.id,
    tipo: p.tipo,
    alumnoId: p.alumno_id,
    claseId: p.clase_id,
    esActual: p.es_actual,
    version: p.version,
    versionAnteriorId: p.version_anterior_id,
    titulo: p.titulo,
    objetivoGeneral: p.objetivo_general,
    observaciones: p.observaciones,
    creadoPorNombre,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

// Arma el árbol completo días > bloques > ejercicios > semanas a partir del
// id de una planificación -- 4 queries filtradas por planificacion_id
// (denormalizado en las 4 tablas hijas a propósito, así no hace falta subir
// varios JOINs), ensambladas en JS.
async function armarCompleta(
  supabase: Awaited<ReturnType<typeof createClient>>,
  resumen: PlanificacionResumen,
): Promise<PlanificacionCompleta> {
  const [{ data: diasRaw }, { data: bloquesRaw }, { data: ejerciciosRaw }, { data: semanasRaw }] = await Promise.all([
    supabase
      .from("planificacion_dias")
      .select("id, nombre, estiramientos, orden")
      .eq("planificacion_id", resumen.id)
      .order("orden"),
    supabase
      .from("planificacion_bloques")
      .select("id, dia_id, nombre, orden")
      .eq("planificacion_id", resumen.id)
      .order("orden"),
    supabase
      .from("planificacion_ejercicios")
      .select("id, bloque_id, nombre, orden")
      .eq("planificacion_id", resumen.id)
      .order("orden"),
    supabase
      .from("planificacion_ejercicio_semanas")
      .select("id, ejercicio_id, numero_semana, carga, series, repeticiones, tiempo, pse, observaciones")
      .eq("planificacion_id", resumen.id)
      .order("numero_semana"),
  ]);

  const semanasPorEjercicio = new Map<string, SemanaEjercicio[]>();
  let maxSemana = SEMANA_DEFAULT_MINIMA;
  for (const s of semanasRaw ?? []) {
    const lista = semanasPorEjercicio.get(s.ejercicio_id) ?? [];
    lista.push({
      id: s.id,
      numeroSemana: s.numero_semana,
      carga: s.carga,
      series: s.series,
      repeticiones: s.repeticiones,
      tiempo: s.tiempo,
      pse: s.pse,
      observaciones: s.observaciones,
    });
    semanasPorEjercicio.set(s.ejercicio_id, lista);
    if (s.numero_semana > maxSemana) maxSemana = s.numero_semana;
  }

  const ejerciciosPorBloque = new Map<string, EjercicioPlanificacion[]>();
  for (const e of ejerciciosRaw ?? []) {
    const lista = ejerciciosPorBloque.get(e.bloque_id) ?? [];
    lista.push({
      id: e.id,
      nombre: e.nombre,
      orden: e.orden,
      semanas: semanasPorEjercicio.get(e.id) ?? [],
    });
    ejerciciosPorBloque.set(e.bloque_id, lista);
  }

  const bloquesPorDia = new Map<string, BloquePlanificacion[]>();
  for (const b of bloquesRaw ?? []) {
    const lista = bloquesPorDia.get(b.dia_id) ?? [];
    lista.push({
      id: b.id,
      nombre: b.nombre,
      orden: b.orden,
      ejercicios: ejerciciosPorBloque.get(b.id) ?? [],
    });
    bloquesPorDia.set(b.dia_id, lista);
  }

  const dias: DiaPlanificacion[] = (diasRaw ?? []).map((d) => ({
    id: d.id,
    nombre: d.nombre,
    estiramientos: d.estiramientos,
    orden: d.orden,
    bloques: bloquesPorDia.get(d.id) ?? [],
  }));

  return { ...resumen, dias, maxSemana };
}

async function obtenerActualPor(
  columna: "alumno_id" | "clase_id",
  valor: string,
): Promise<PlanificacionCompleta | null> {
  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("planificaciones")
    .select("*")
    .eq(columna, valor)
    .eq("es_actual", true)
    .maybeSingle();

  if (!plan) return null;

  const creadoPorNombre = await nombreDe(supabase, plan.creado_por);
  return armarCompleta(supabase, aResumen(plan, creadoPorNombre));
}

export async function obtenerPlanificacionActualDeAlumno(alumnoId: string): Promise<PlanificacionCompleta | null> {
  return obtenerActualPor("alumno_id", alumnoId);
}

export async function obtenerPlanificacionActualDeClase(claseId: string): Promise<PlanificacionCompleta | null> {
  return obtenerActualPor("clase_id", claseId);
}

export async function obtenerPlanificacionPorId(id: string): Promise<PlanificacionCompleta | null> {
  const supabase = await createClient();
  const { data: plan } = await supabase.from("planificaciones").select("*").eq("id", id).maybeSingle();
  if (!plan) return null;

  const creadoPorNombre = await nombreDe(supabase, plan.creado_por);
  return armarCompleta(supabase, aResumen(plan, creadoPorNombre));
}

async function listarHistorialPor(columna: "alumno_id" | "clase_id", valor: string): Promise<PlanificacionResumen[]> {
  const supabase = await createClient();
  const { data: planes } = await supabase
    .from("planificaciones")
    .select("*")
    .eq(columna, valor)
    .eq("es_actual", false)
    .order("created_at", { ascending: false });

  if (!planes || planes.length === 0) return [];

  const autorIds = [...new Set(planes.map((p) => p.creado_por))];
  const { data: perfiles } = await supabase.from("profiles").select("id, nombre, apellido").in("id", autorIds);
  const nombrePorId = new Map((perfiles ?? []).map((p) => [p.id, `${p.nombre} ${p.apellido}`]));

  return planes.map((p) => aResumen(p, nombrePorId.get(p.creado_por) ?? "?"));
}

export async function listarHistorialDeAlumno(alumnoId: string): Promise<PlanificacionResumen[]> {
  return listarHistorialPor("alumno_id", alumnoId);
}

export async function listarHistorialDeClase(claseId: string): Promise<PlanificacionResumen[]> {
  return listarHistorialPor("clase_id", claseId);
}
