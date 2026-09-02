import { createClient } from "@/lib/supabase/server";
import type { TurnoPosible } from "@/types/database";

// Compartido entre /admin/alumnos/[id] y /profesor/alumnas/[id] -- la RLS
// (fichas_evaluacion / ficha_evaluacion_pruebas_funcionales /
// ficha_evaluacion_notas, migraciones 20260901110000 + 20260902110000) ya
// resuelve sola quién puede ver o tocar los datos de cada alumno según el
// rol de quien pregunta, así que estas funciones no necesitan un
// requireRole propio: simplemente devuelven lo que la base deje ver.
//
// Los labels (ej. TURNO_LABELS) NO viven acá -- este archivo importa
// lib/supabase/server.ts (-> next/headers), así que un Client Component que
// importara un valor de acá rompería el build. Ver
// lib/fichas-evaluacion-labels.ts.

// ---------------------------------------------------------------------------
// Sedes -- para el selector "Gimnasio" de la ficha. Las 3 sedes reales de
// MUV, no texto libre.
// ---------------------------------------------------------------------------
export type SedeOption = { id: string; nombre: string };

export async function listarSedesParaFicha(): Promise<SedeOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("sedes").select("id, nombre").order("nombre");
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Ficha de evaluación (páginas 1 y 3 del PDF real) -- una fila por alumno,
// igual que antes de esta tarea (upsert por alumno_id). "existe: false"
// significa que todavía no se cargó ninguna.
// ---------------------------------------------------------------------------
export type FichaEvaluacion = {
  alumnoId: string;
  existe: boolean;
  numero: number | null;
  sedeId: string | null;
  sedeNombre: string | null;
  fechaEvaluacion: string | null;
  profesionalEvaluadorNombre: string | null;
  edad: number | null;
  medicoDeriva: string | null;
  actividadFisicaPrevia: string | null;
  actividadLaboral: string | null;
  diagnostico: string | null;
  dolorActual: number | null;
  dolorZonaMomento: string | null;
  observacionesIniciales: string | null;
  objetivo1: string | null;
  objetivo2: string | null;
  objetivo3: string | null;
  observacionesPlanificacion: string | null;
  contactoFamiliarNombre: string | null;
  contactoFamiliarVinculo: string | null;
  contactoFamiliarTelefono: string | null;
  avisosGrupo: boolean | null;
  avisosGrupoNumero: string | null;
  diasPosibles: number[];
  turnosPosibles: TurnoPosible[];
  horariosPosibles: string | null;
  actualizadoPorNombre: string | null;
  updatedAt: string | null;
};

function fichaVacia(alumnoId: string): FichaEvaluacion {
  return {
    alumnoId,
    existe: false,
    numero: null,
    sedeId: null,
    sedeNombre: null,
    fechaEvaluacion: null,
    profesionalEvaluadorNombre: null,
    edad: null,
    medicoDeriva: null,
    actividadFisicaPrevia: null,
    actividadLaboral: null,
    diagnostico: null,
    dolorActual: null,
    dolorZonaMomento: null,
    observacionesIniciales: null,
    objetivo1: null,
    objetivo2: null,
    objetivo3: null,
    observacionesPlanificacion: null,
    contactoFamiliarNombre: null,
    contactoFamiliarVinculo: null,
    contactoFamiliarTelefono: null,
    avisosGrupo: null,
    avisosGrupoNumero: null,
    diasPosibles: [],
    turnosPosibles: [],
    horariosPosibles: null,
    actualizadoPorNombre: null,
    updatedAt: null,
  };
}

export async function obtenerFicha(alumnoId: string): Promise<FichaEvaluacion> {
  const supabase = await createClient();

  const { data: ficha } = await supabase.from("fichas_evaluacion").select("*").eq("alumno_id", alumnoId).maybeSingle();
  if (!ficha) return fichaVacia(alumnoId);

  const idsAResolver = [ficha.actualizado_por, ficha.profesional_evaluador_id].filter((id): id is string => Boolean(id));
  const [{ data: perfiles }, { data: sede }] = await Promise.all([
    idsAResolver.length > 0
      ? supabase.from("profiles").select("id, nombre, apellido").in("id", idsAResolver)
      : Promise.resolve({ data: [] as { id: string; nombre: string; apellido: string }[] }),
    ficha.sede_id
      ? supabase.from("sedes").select("nombre").eq("id", ficha.sede_id).maybeSingle()
      : Promise.resolve({ data: null as { nombre: string } | null }),
  ]);
  const nombrePorId = new Map((perfiles ?? []).map((p) => [p.id, `${p.nombre} ${p.apellido}`]));

  return {
    alumnoId,
    existe: true,
    numero: ficha.numero,
    sedeId: ficha.sede_id,
    sedeNombre: sede?.nombre ?? null,
    fechaEvaluacion: ficha.fecha_evaluacion,
    profesionalEvaluadorNombre: ficha.profesional_evaluador_id ? nombrePorId.get(ficha.profesional_evaluador_id) ?? null : null,
    edad: ficha.edad,
    medicoDeriva: ficha.medico_deriva,
    actividadFisicaPrevia: ficha.actividad_fisica_previa,
    actividadLaboral: ficha.actividad_laboral,
    diagnostico: ficha.diagnostico,
    dolorActual: ficha.dolor_actual,
    dolorZonaMomento: ficha.dolor_zona_momento,
    observacionesIniciales: ficha.observaciones_iniciales,
    objetivo1: ficha.objetivo_1,
    objetivo2: ficha.objetivo_2,
    objetivo3: ficha.objetivo_3,
    observacionesPlanificacion: ficha.observaciones_planificacion,
    contactoFamiliarNombre: ficha.contacto_familiar_nombre,
    contactoFamiliarVinculo: ficha.contacto_familiar_vinculo,
    contactoFamiliarTelefono: ficha.contacto_familiar_telefono,
    avisosGrupo: ficha.avisos_grupo,
    avisosGrupoNumero: ficha.avisos_grupo_numero,
    diasPosibles: ficha.dias_posibles ?? [],
    turnosPosibles: ficha.turnos_posibles ?? [],
    horariosPosibles: ficha.horarios_posibles,
    actualizadoPorNombre: ficha.actualizado_por ? nombrePorId.get(ficha.actualizado_por) ?? null : null,
    updatedAt: ficha.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Pruebas funcionales (página 2 del PDF) -- tabla insert-only preparada para
// reevaluaciones futuras (ver migración), pero acá solo se lee/edita la fila
// es_inicial=true (la evaluación de ingreso). No hay UI de reevaluación en
// este bloque.
// ---------------------------------------------------------------------------
export type PruebasFuncionales = {
  id: string;
  fecha: string;
  autorNombre: string | null;
  elevacionPiernaRectaDerecha: string | null;
  elevacionPiernaRectaIzquierda: string | null;
  elevacionPiernaRectaObs: string | null;
  flexionTroncoResultado: string | null;
  flexionTroncoObs: string | null;
  rotadoresCaderaDerecha: string | null;
  rotadoresCaderaIzquierda: string | null;
  rotadoresCaderaObs: string | null;
  equilibrioCerradosDerechaSeg: number | null;
  equilibrioCerradosIzquierdaSeg: number | null;
  equilibrioCerradosObs: string | null;
  equilibrioAbiertosDerechaSeg: number | null;
  equilibrioAbiertosIzquierdaSeg: number | null;
  equilibrioAbiertosObs: string | null;
  alcanceManosDerecha: string | null;
  alcanceManosIzquierda: string | null;
  alcanceManosObs: string | null;
  angelParedDistanciaDerechaCm: number | null;
  angelParedDistanciaIzquierdaCm: number | null;
  angelParedDistanciaObs: string | null;
  angelParedApoyaNuca: boolean | null;
  angelParedApoyaLumbar: boolean | null;
  angelParedApoyosObs: string | null;
  observacionesGenerales: string | null;
};

export async function obtenerPruebasFuncionalesIniciales(alumnoId: string): Promise<PruebasFuncionales | null> {
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("ficha_evaluacion_pruebas_funcionales")
    .select("*")
    .eq("alumno_id", alumnoId)
    .eq("es_inicial", true)
    .maybeSingle();

  if (!p) return null;

  let autorNombre: string | null = null;
  if (p.autor_id) {
    const { data: autor } = await supabase.from("profiles").select("nombre, apellido").eq("id", p.autor_id).maybeSingle();
    autorNombre = autor ? `${autor.nombre} ${autor.apellido}` : null;
  }

  return {
    id: p.id,
    fecha: p.fecha,
    autorNombre,
    elevacionPiernaRectaDerecha: p.elevacion_pierna_recta_derecha,
    elevacionPiernaRectaIzquierda: p.elevacion_pierna_recta_izquierda,
    elevacionPiernaRectaObs: p.elevacion_pierna_recta_obs,
    flexionTroncoResultado: p.flexion_tronco_resultado,
    flexionTroncoObs: p.flexion_tronco_obs,
    rotadoresCaderaDerecha: p.rotadores_cadera_derecha,
    rotadoresCaderaIzquierda: p.rotadores_cadera_izquierda,
    rotadoresCaderaObs: p.rotadores_cadera_obs,
    equilibrioCerradosDerechaSeg: p.equilibrio_cerrados_derecha_seg,
    equilibrioCerradosIzquierdaSeg: p.equilibrio_cerrados_izquierda_seg,
    equilibrioCerradosObs: p.equilibrio_cerrados_obs,
    equilibrioAbiertosDerechaSeg: p.equilibrio_abiertos_derecha_seg,
    equilibrioAbiertosIzquierdaSeg: p.equilibrio_abiertos_izquierda_seg,
    equilibrioAbiertosObs: p.equilibrio_abiertos_obs,
    alcanceManosDerecha: p.alcance_manos_derecha,
    alcanceManosIzquierda: p.alcance_manos_izquierda,
    alcanceManosObs: p.alcance_manos_obs,
    angelParedDistanciaDerechaCm: p.angel_pared_distancia_derecha_cm,
    angelParedDistanciaIzquierdaCm: p.angel_pared_distancia_izquierda_cm,
    angelParedDistanciaObs: p.angel_pared_distancia_obs,
    angelParedApoyaNuca: p.angel_pared_apoya_nuca,
    angelParedApoyaLumbar: p.angel_pared_apoya_lumbar,
    angelParedApoyosObs: p.angel_pared_apoyos_obs,
    observacionesGenerales: p.observaciones_generales,
  };
}

// ---------------------------------------------------------------------------
// Evolución / seguimiento -- historial append-only (ficha_evaluacion_notas).
// ---------------------------------------------------------------------------
export type NotaEvolucion = {
  id: string;
  autorNombre: string;
  contenido: string;
  fecha: string;
  createdAt: string;
};

export async function listarNotasEvolucion(alumnoId: string): Promise<NotaEvolucion[]> {
  const supabase = await createClient();

  const { data: notas, error } = await supabase
    .from("ficha_evaluacion_notas")
    .select("id, autor_id, contenido, fecha, created_at")
    .eq("alumno_id", alumnoId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fichas-evaluacion-data] error leyendo ficha_evaluacion_notas", error);
    return [];
  }
  if (!notas || notas.length === 0) return [];

  const autorIds = [...new Set(notas.map((n) => n.autor_id).filter((id): id is string => id !== null))];
  const { data: autores } =
    autorIds.length > 0 ? await supabase.from("profiles").select("id, nombre, apellido").in("id", autorIds) : { data: [] };
  const autorPorId = new Map((autores ?? []).map((a) => [a.id, `${a.nombre} ${a.apellido}`]));

  return notas.map(
    (n): NotaEvolucion => ({
      id: n.id,
      autorNombre: (n.autor_id && autorPorId.get(n.autor_id)) || "?",
      contenido: n.contenido,
      fecha: n.fecha,
      createdAt: n.created_at,
    }),
  );
}
