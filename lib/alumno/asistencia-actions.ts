"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ConfirmarAsistenciaResult = { ok: boolean; message: string };

// La alumna confirma que va a ir a su clase de hoy. Un trigger de la base
// (fn_validar_ventana_confirmacion_asistencia, migración
// 20260831120000) rechaza la confirmación si todavía no se abrió la
// ventana (1hs antes del inicio) o si la clase ya terminó -- el mensaje que
// llega en error.message ya está pensado para mostrarse tal cual.
export async function confirmarAsistencia(claseId: string, fecha: string): Promise<ConfirmarAsistenciaResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Iniciá sesión de nuevo." };
  }

  const { error } = await supabase
    .from("asistencias")
    .upsert(
      { clase_id: claseId, alumno_id: user.id, fecha, confirmado: true },
      { onConflict: "clase_id,alumno_id,fecha" },
    );

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/alumno/inscripciones");
  revalidatePath("/alumno");
  return { ok: true, message: "Confirmaste tu asistencia." };
}
