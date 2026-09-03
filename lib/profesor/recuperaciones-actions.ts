"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerElegibilidadRecuperacion } from "./recuperaciones-data";

export type RecuperacionResult = { ok: boolean; message: string };
export type AlumnaPilatesItem = { alumnoId: string; nombre: string; apellido: string };

// Busca alumnas con Pilates activo por nombre/apellido para agregarlas como
// recuperación -- resuelto en fn_buscar_alumnas_pilates (security definer,
// migración 20260904090000) porque un profesor no tiene acceso general a
// todo el padrón de alumnas, solo a las suyas (fn_es_mi_alumno).
export async function buscarAlumnasPilates(query: string): Promise<AlumnaPilatesItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_buscar_alumnas_pilates", { p_query: q });

  if (error) {
    console.error("[recuperaciones-actions] error en fn_buscar_alumnas_pilates", error);
    return [];
  }

  return (data ?? []).map((d): AlumnaPilatesItem => ({ alumnoId: d.alumno_id, nombre: d.nombre, apellido: d.apellido }));
}

// Agrega una recuperación de Pilates a esta clase+fecha. Valida, en orden:
// la clase es de Pilates y está activa; hay cupo real ese día (cupo menos
// inscriptas habituales activas menos recuperaciones ya cargadas para esa
// misma fecha); la alumna no es ya alumna habitual de ESTA clase (no tiene
// sentido "recuperarla" en su propio horario); no hay ya una fila de
// asistencia suya ese día en esta clase; y por último la elegibilidad real
// (ausencia de Pilates sin recuperar en este mes calendario + no superó el
// máximo según su frecuencia semanal -- ver obtenerElegibilidadRecuperacion,
// que además deja enlazada la recuperación a la ausencia puntual que
// repone). Nunca confía en nada mandado desde el cliente más allá de los 3
// ids -- todo lo demás se recalcula acá, server-side.
export async function agregarRecuperacionPilates(claseId: string, fecha: string, alumnoId: string): Promise<RecuperacionResult> {
  const supabase = await createClient();

  const [{ data: clase }, { data: actividadPilates }] = await Promise.all([
    supabase.from("clases").select("id, actividad_id, activa, cupo").eq("id", claseId).single(),
    supabase.from("actividades").select("id").eq("nombre", "Pilates").single(),
  ]);

  if (!clase || !clase.activa) {
    return { ok: false, message: "Esta clase no está activa." };
  }
  if (!actividadPilates || clase.actividad_id !== actividadPilates.id) {
    return { ok: false, message: "Las recuperaciones son solo para clases de Pilates." };
  }

  const [{ count: inscriptosActivos }, { count: recuperacionesEseDia }, { data: yaInscripta }, { data: asistenciaExistente }] =
    await Promise.all([
      supabase.from("inscripciones").select("id", { count: "exact", head: true }).eq("clase_id", claseId).eq("estado", "activa"),
      supabase
        .from("asistencias")
        .select("id", { count: "exact", head: true })
        .eq("clase_id", claseId)
        .eq("fecha", fecha)
        .eq("es_recuperacion", true),
      supabase
        .from("inscripciones")
        .select("id")
        .eq("clase_id", claseId)
        .eq("alumno_id", alumnoId)
        .eq("estado", "activa")
        .maybeSingle(),
      supabase.from("asistencias").select("id").eq("clase_id", claseId).eq("alumno_id", alumnoId).eq("fecha", fecha).maybeSingle(),
    ]);

  if (yaInscripta) {
    return { ok: false, message: "Esta alumna ya está anotada habitualmente en esta clase -- no hace falta recuperarla acá." };
  }
  if (asistenciaExistente) {
    return { ok: false, message: "Esta alumna ya tiene una fila de asistencia cargada ese día en esta clase." };
  }

  const ocupados = (inscriptosActivos ?? 0) + (recuperacionesEseDia ?? 0);
  if (ocupados >= clase.cupo) {
    return { ok: false, message: "Esta clase ya está al cupo máximo para esta fecha." };
  }

  const elegibilidad = await obtenerElegibilidadRecuperacion(supabase, alumnoId, fecha);
  if (!elegibilidad.ok) {
    return { ok: false, message: elegibilidad.motivo };
  }

  const { error } = await supabase.from("asistencias").insert({
    clase_id: claseId,
    alumno_id: alumnoId,
    fecha,
    es_recuperacion: true,
    agregado_manualmente: true,
    recupera_ausencia_id: elegibilidad.ausenciaId,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/profesor/clases/${claseId}`);
  return { ok: true, message: "Recuperación agregada -- ya aparece en la lista de esta clase." };
}
