"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TurnoResult = { ok: boolean; message: string };

const LOG = "[alumno/turnos-actions]";

function revalidarTurnos() {
  revalidatePath("/alumno/inscripciones");
  revalidatePath("/alumno/recuperar");
}

// "Dejar" el turno de una sesión puntual -- no toca la inscripción semanal
// fija (sigue activa), solo señala que ese día en particular el lugar queda
// libre para que otra alumna de la misma sede lo recupere. La ventana (hasta
// 1hs antes) la valida el trigger fn_validar_liberacion_turno.
export async function liberarTurno(claseId: string, fecha: string): Promise<TurnoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Iniciá sesión de nuevo." };
  }

  const { error } = await supabase
    .from("turnos_liberados")
    .insert({ clase_id: claseId, fecha, alumno_original_id: user.id });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Ya habías liberado tu turno de esta clase." };
    }
    return { ok: false, message: error.message };
  }

  revalidarTurnos();
  return { ok: true, message: "Liberaste tu turno -- otra alumna de tu sede puede tomarlo." };
}

// Deshacer una liberación TODAVÍA no tomada por nadie (si ya la tomaron,
// falla por RLS -- "alumno cancela su propio turno liberado sin tomar" exige
// tomado_por_id is null).
export async function cancelarLiberacion(turnoId: string): Promise<TurnoResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("turnos_liberados").delete().eq("id", turnoId);

  if (error) {
    return { ok: false, message: "No se pudo cancelar -- puede que alguien ya haya tomado ese turno." };
  }

  revalidarTurnos();
  return { ok: true, message: "Cancelaste la liberación de tu turno." };
}

// Tomar un turno liberado = recuperar una clase. El trigger
// fn_validar_reclamo_turno_liberado valida ventana, sede y el cupo mensual
// (configuracion_recuperaciones) antes de dejar pasar el UPDATE. Si eso pasa,
// se crea además la fila de asistencia con es_recuperacion=true para que el
// profesor la vea en su lista de confirmadas.
export async function tomarTurno(turnoId: string): Promise<TurnoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Iniciá sesión de nuevo." };
  }

  const { data: turno, error: errorSelect } = await supabase
    .from("turnos_liberados")
    .select("clase_id, fecha")
    .eq("id", turnoId)
    .single();

  if (errorSelect || !turno) {
    return { ok: false, message: "Ese turno ya no está disponible." };
  }

  const { error } = await supabase
    .from("turnos_liberados")
    .update({ tomado_por_id: user.id, tomado_en: new Date().toISOString() })
    .eq("id", turnoId);

  if (error) {
    return { ok: false, message: error.message };
  }

  // El turno ya quedó tomado en este punto -- si la asistencia falla, no se
  // revierte (mejor que la alumna se quede con el lugar y el profesor la
  // agregue a mano, a que pierda el lugar por un error transitorio acá).
  const { error: errorAsistencia } = await supabase.from("asistencias").insert({
    clase_id: turno.clase_id,
    alumno_id: user.id,
    fecha: turno.fecha,
    confirmado: true,
    es_recuperacion: true,
  });

  if (errorAsistencia) {
    console.error(`${LOG} turno ${turnoId} tomado pero falló crear la asistencia de recuperación`, errorAsistencia);
    revalidarTurnos();
    return {
      ok: true,
      message: "Tomaste el turno, pero avisale al profesor -- no se pudo registrar tu asistencia automáticamente.",
    };
  }

  revalidarTurnos();
  return { ok: true, message: "¡Listo! Tomaste el turno." };
}
