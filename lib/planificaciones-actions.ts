"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TipoPlanificacion } from "@/types/database";

export type PlanResult = { ok: boolean; message: string };

// Las rutas de alumno (profesor/admin) y de clase revalidan distinto -- se
// revalidan las 4 posibles de una (más barato que pasar la ruta exacta a
// cada acción, y revalidatePath con una ruta que no existe no rompe nada).
function revalidarPlanificacion(alumnoId: string | null, claseId: string | null) {
  if (alumnoId) {
    revalidatePath(`/profesor/alumnas/${alumnoId}/planificacion`);
    revalidatePath(`/admin/alumnos/${alumnoId}/planificacion`);
  }
  if (claseId) {
    revalidatePath(`/profesor/clases/${claseId}/planificacion`);
    revalidatePath(`/admin/clases/${claseId}/planificacion`);
  }
}

function leerMetadata(formData: FormData) {
  return {
    titulo: String(formData.get("titulo") ?? "").trim() || null,
    objetivoGeneral: String(formData.get("objetivo_general") ?? "").trim() || null,
    observaciones: String(formData.get("observaciones") ?? "").trim() || null,
  };
}

// ---------------------------------------------------------------------------
// Creación de la primera versión (individual o grupal) -- RLS
// ("profesor crea planificaciones ... autorizadas") exige creado_por =
// auth.uid() y que el alumno/clase sea propio, así que no hace falta
// re-chequear nada acá aparte de armar el insert.
// ---------------------------------------------------------------------------
async function crearPlanificacion(
  tipo: TipoPlanificacion,
  owner: { alumnoId?: string; claseId?: string },
  formData: FormData,
): Promise<PlanResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Iniciá sesión de nuevo." };

  const meta = leerMetadata(formData);
  const { error } = await supabase.from("planificaciones").insert({
    tipo,
    alumno_id: owner.alumnoId ?? null,
    clase_id: owner.claseId ?? null,
    es_actual: true,
    version: 1,
    creado_por: user.id,
    titulo: meta.titulo,
    objetivo_general: meta.objetivoGeneral,
    observaciones: meta.observaciones,
  });

  if (error) return { ok: false, message: error.message };

  revalidarPlanificacion(owner.alumnoId ?? null, owner.claseId ?? null);
  return { ok: true, message: "Planificación creada." };
}

export async function crearPlanificacionIndividual(alumnoId: string, formData: FormData): Promise<PlanResult> {
  return crearPlanificacion("individual", { alumnoId }, formData);
}

export async function crearPlanificacionGrupal(claseId: string, formData: FormData): Promise<PlanResult> {
  return crearPlanificacion("grupal", { claseId }, formData);
}

// ---------------------------------------------------------------------------
// Editar título/objetivo/observaciones de la versión ACTUAL -- RLS ya
// bloquea esto si la fila no es es_actual=true (versión histórica).
// ---------------------------------------------------------------------------
export async function actualizarMetadataPlanificacion(
  planificacionId: string,
  formData: FormData,
): Promise<PlanResult> {
  const supabase = await createClient();
  const meta = leerMetadata(formData);

  const { data, error } = await supabase
    .from("planificaciones")
    .update({ titulo: meta.titulo, objetivo_general: meta.objetivoGeneral, observaciones: meta.observaciones })
    .eq("id", planificacionId)
    .select("alumno_id, clase_id")
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "No se pudo actualizar (¿ya no es la versión actual?)." };

  revalidarPlanificacion(data.alumno_id, data.clase_id);
  return { ok: true, message: "Datos guardados." };
}

// ---------------------------------------------------------------------------
// Días / Bloques / Ejercicios: CRUD + reordenar (mover arriba/abajo con el
// hermano vecino, sin drag-and-drop). Todas dependen de RLS para bloquear
// escrituras sobre versiones históricas -- acá no hace falta repetir ese
// chequeo.
// ---------------------------------------------------------------------------
export async function agregarDia(planificacionId: string, nombre: string): Promise<PlanResult> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("planificacion_dias")
    .select("id", { count: "exact", head: true })
    .eq("planificacion_id", planificacionId);

  const { data: plan, error } = await supabase
    .from("planificacion_dias")
    .insert({ planificacion_id: planificacionId, nombre: nombre || `Día ${(count ?? 0) + 1}`, orden: count ?? 0 })
    .select("planificacion_id")
    .single();

  if (error || !plan) return { ok: false, message: error?.message ?? "No se pudo agregar el día." };

  await revalidarPorPlanificacion(supabase, plan.planificacion_id);
  return { ok: true, message: "Día agregado." };
}

export async function renombrarDia(diaId: string, nombre: string): Promise<PlanResult> {
  if (!nombre.trim()) return { ok: false, message: "El nombre no puede estar vacío." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planificacion_dias")
    .update({ nombre: nombre.trim() })
    .eq("id", diaId)
    .select("planificacion_id")
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "No se pudo renombrar (¿versión no editable?)." };

  await revalidarPorPlanificacion(supabase, data.planificacion_id);
  return { ok: true, message: "Día renombrado." };
}

// El texto libre de estiramientos vive en la misma fila que el día (no es
// un bloque de ejercicios con semanas) -- se guarda con su propia acción en
// vez de forzar el acoplamiento con renombrarDia.
export async function guardarEstiramientosDia(diaId: string, estiramientos: string): Promise<PlanResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planificacion_dias")
    .update({ estiramientos: estiramientos.trim() || null })
    .eq("id", diaId)
    .select("planificacion_id")
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "No se pudo guardar (¿versión no editable?)." };

  await revalidarPorPlanificacion(supabase, data.planificacion_id);
  return { ok: true, message: "Estiramientos guardados." };
}

export async function eliminarDia(diaId: string): Promise<PlanResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planificacion_dias")
    .delete()
    .eq("id", diaId)
    .select("planificacion_id")
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "No se pudo eliminar (¿versión no editable?)." };

  await revalidarPorPlanificacion(supabase, data.planificacion_id);
  return { ok: true, message: "Día eliminado." };
}

export async function moverDia(diaId: string, direccion: "arriba" | "abajo"): Promise<PlanResult> {
  const supabase = await createClient();
  const { data: dia } = await supabase
    .from("planificacion_dias")
    .select("id, planificacion_id, orden")
    .eq("id", diaId)
    .maybeSingle();
  if (!dia) return { ok: false, message: "Día no encontrado." };

  const { data: hermanos } = await supabase
    .from("planificacion_dias")
    .select("id, orden")
    .eq("planificacion_id", dia.planificacion_id)
    .order("orden");

  const vecino = encontrarVecino(hermanos ?? [], diaId, direccion);
  if (!vecino) return { ok: true, message: "Ya está en un extremo." };

  await Promise.all([
    supabase.from("planificacion_dias").update({ orden: vecino.orden }).eq("id", dia.id),
    supabase.from("planificacion_dias").update({ orden: dia.orden }).eq("id", vecino.id),
  ]);

  await revalidarPorPlanificacion(supabase, dia.planificacion_id);
  return { ok: true, message: "Orden actualizado." };
}

export async function agregarBloque(diaId: string, nombre: string): Promise<PlanResult> {
  const supabase = await createClient();
  const { data: dia } = await supabase
    .from("planificacion_dias")
    .select("planificacion_id")
    .eq("id", diaId)
    .maybeSingle();
  if (!dia) return { ok: false, message: "Día no encontrado." };

  const { count } = await supabase
    .from("planificacion_bloques")
    .select("id", { count: "exact", head: true })
    .eq("dia_id", diaId);

  const { error } = await supabase.from("planificacion_bloques").insert({
    planificacion_id: dia.planificacion_id,
    dia_id: diaId,
    nombre: nombre || `Bloque ${(count ?? 0) + 1}`,
    orden: count ?? 0,
  });

  if (error) return { ok: false, message: error.message };

  await revalidarPorPlanificacion(supabase, dia.planificacion_id);
  return { ok: true, message: "Bloque agregado." };
}

export async function renombrarBloque(bloqueId: string, nombre: string): Promise<PlanResult> {
  if (!nombre.trim()) return { ok: false, message: "El nombre no puede estar vacío." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planificacion_bloques")
    .update({ nombre: nombre.trim() })
    .eq("id", bloqueId)
    .select("planificacion_id")
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "No se pudo renombrar (¿versión no editable?)." };

  await revalidarPorPlanificacion(supabase, data.planificacion_id);
  return { ok: true, message: "Bloque renombrado." };
}

export async function eliminarBloque(bloqueId: string): Promise<PlanResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planificacion_bloques")
    .delete()
    .eq("id", bloqueId)
    .select("planificacion_id")
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "No se pudo eliminar (¿versión no editable?)." };

  await revalidarPorPlanificacion(supabase, data.planificacion_id);
  return { ok: true, message: "Bloque eliminado." };
}

export async function moverBloque(bloqueId: string, direccion: "arriba" | "abajo"): Promise<PlanResult> {
  const supabase = await createClient();
  const { data: bloque } = await supabase
    .from("planificacion_bloques")
    .select("id, planificacion_id, dia_id, orden")
    .eq("id", bloqueId)
    .maybeSingle();
  if (!bloque) return { ok: false, message: "Bloque no encontrado." };

  const { data: hermanos } = await supabase
    .from("planificacion_bloques")
    .select("id, orden")
    .eq("dia_id", bloque.dia_id)
    .order("orden");

  const vecino = encontrarVecino(hermanos ?? [], bloqueId, direccion);
  if (!vecino) return { ok: true, message: "Ya está en un extremo." };

  await Promise.all([
    supabase.from("planificacion_bloques").update({ orden: vecino.orden }).eq("id", bloque.id),
    supabase.from("planificacion_bloques").update({ orden: bloque.orden }).eq("id", vecino.id),
  ]);

  await revalidarPorPlanificacion(supabase, bloque.planificacion_id);
  return { ok: true, message: "Orden actualizado." };
}

export async function agregarEjercicio(bloqueId: string, nombre: string): Promise<PlanResult> {
  if (!nombre.trim()) return { ok: false, message: "Ingresá el nombre del ejercicio." };
  const supabase = await createClient();
  const { data: bloque } = await supabase
    .from("planificacion_bloques")
    .select("planificacion_id")
    .eq("id", bloqueId)
    .maybeSingle();
  if (!bloque) return { ok: false, message: "Bloque no encontrado." };

  const { count } = await supabase
    .from("planificacion_ejercicios")
    .select("id", { count: "exact", head: true })
    .eq("bloque_id", bloqueId);

  const { error } = await supabase.from("planificacion_ejercicios").insert({
    planificacion_id: bloque.planificacion_id,
    bloque_id: bloqueId,
    nombre: nombre.trim(),
    orden: count ?? 0,
  });

  if (error) return { ok: false, message: error.message };

  await revalidarPorPlanificacion(supabase, bloque.planificacion_id);
  return { ok: true, message: "Ejercicio agregado." };
}

export async function renombrarEjercicio(ejercicioId: string, nombre: string): Promise<PlanResult> {
  if (!nombre.trim()) return { ok: false, message: "El nombre no puede estar vacío." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planificacion_ejercicios")
    .update({ nombre: nombre.trim() })
    .eq("id", ejercicioId)
    .select("planificacion_id")
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "No se pudo renombrar (¿versión no editable?)." };

  await revalidarPorPlanificacion(supabase, data.planificacion_id);
  return { ok: true, message: "Ejercicio renombrado." };
}

export async function eliminarEjercicio(ejercicioId: string): Promise<PlanResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planificacion_ejercicios")
    .delete()
    .eq("id", ejercicioId)
    .select("planificacion_id")
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "No se pudo eliminar (¿versión no editable?)." };

  await revalidarPorPlanificacion(supabase, data.planificacion_id);
  return { ok: true, message: "Ejercicio eliminado." };
}

export async function moverEjercicio(ejercicioId: string, direccion: "arriba" | "abajo"): Promise<PlanResult> {
  const supabase = await createClient();
  const { data: ejercicio } = await supabase
    .from("planificacion_ejercicios")
    .select("id, planificacion_id, bloque_id, orden")
    .eq("id", ejercicioId)
    .maybeSingle();
  if (!ejercicio) return { ok: false, message: "Ejercicio no encontrado." };

  const { data: hermanos } = await supabase
    .from("planificacion_ejercicios")
    .select("id, orden")
    .eq("bloque_id", ejercicio.bloque_id)
    .order("orden");

  const vecino = encontrarVecino(hermanos ?? [], ejercicioId, direccion);
  if (!vecino) return { ok: true, message: "Ya está en un extremo." };

  await Promise.all([
    supabase.from("planificacion_ejercicios").update({ orden: vecino.orden }).eq("id", ejercicio.id),
    supabase.from("planificacion_ejercicios").update({ orden: ejercicio.orden }).eq("id", vecino.id),
  ]);

  await revalidarPorPlanificacion(supabase, ejercicio.planificacion_id);
  return { ok: true, message: "Orden actualizado." };
}

// ---------------------------------------------------------------------------
// Semana de un ejercicio -- upsert por (ejercicio_id, numero_semana). "Quitar
// semana" no existe como acción aparte: se sobreescriben los campos a vacío
// guardando de nuevo, o directamente no se completa esa semana (no hace
// falta que la fila exista para que la semana "no esté cargada").
// ---------------------------------------------------------------------------
export async function guardarSemanaEjercicio(
  ejercicioId: string,
  numeroSemana: number,
  formData: FormData,
): Promise<PlanResult> {
  const supabase = await createClient();
  const { data: ejercicio } = await supabase
    .from("planificacion_ejercicios")
    .select("planificacion_id")
    .eq("id", ejercicioId)
    .maybeSingle();
  if (!ejercicio) return { ok: false, message: "Ejercicio no encontrado." };

  const campo = (nombre: string) => String(formData.get(nombre) ?? "").trim() || null;

  const { error } = await supabase.from("planificacion_ejercicio_semanas").upsert(
    {
      planificacion_id: ejercicio.planificacion_id,
      ejercicio_id: ejercicioId,
      numero_semana: numeroSemana,
      carga: campo("carga"),
      series: campo("series"),
      repeticiones: campo("repeticiones"),
      tiempo: campo("tiempo"),
      pse: campo("pse"),
      observaciones: campo("observaciones"),
    },
    { onConflict: "ejercicio_id,numero_semana" },
  );

  if (error) return { ok: false, message: error.message };

  await revalidarPorPlanificacion(supabase, ejercicio.planificacion_id);
  return { ok: true, message: "Semana guardada." };
}

// ---------------------------------------------------------------------------
// Helpers internos (no exportados como Server Actions -- "use server" exige
// que TODO export de este archivo sea invocable como acción, por eso van
// después de todas las exportadas y sin "export").
// ---------------------------------------------------------------------------
function encontrarVecino<T extends { id: string; orden: number }>(
  hermanos: T[],
  id: string,
  direccion: "arriba" | "abajo",
): T | null {
  const idx = hermanos.findIndex((h) => h.id === id);
  if (idx === -1) return null;
  const vecinoIdx = direccion === "arriba" ? idx - 1 : idx + 1;
  return hermanos[vecinoIdx] ?? null;
}

async function revalidarPorPlanificacion(supabase: Awaited<ReturnType<typeof createClient>>, planificacionId: string) {
  const { data } = await supabase
    .from("planificaciones")
    .select("alumno_id, clase_id")
    .eq("id", planificacionId)
    .maybeSingle();
  if (data) revalidarPlanificacion(data.alumno_id, data.clase_id);
}
