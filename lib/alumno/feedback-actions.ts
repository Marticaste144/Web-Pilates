"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";

// Comentario corto que la alumna deja sobre una sesión puntual de su clase
// (ej. "me quedó doliendo la zona lumbar"). Solo puede dejarlo sobre una
// clase en la que está activamente inscripta -- lo mismo que valida
// trg... no, acá lo valida la policy "alumno deja feedback de sus propias
// clases" (migración 20260831130000). Sin edición posterior: es una nota
// puntual, no algo que se corrija después.
export async function dejarFeedback(_prevState: FormState, formData: FormData): Promise<FormState> {
  const claseId = String(formData.get("clase_id") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  const comentario = String(formData.get("comentario") ?? "").trim();

  if (!claseId || !fecha) {
    return { status: "error", message: "Faltan datos de la clase." };
  }
  if (!comentario) {
    return { status: "error", message: "Escribí un comentario antes de enviar." };
  }
  if (comentario.length > 1000) {
    return { status: "error", message: "El comentario es demasiado largo (máx. 1000 caracteres)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Iniciá sesión de nuevo." };
  }

  const { error } = await supabase
    .from("feedback_clases")
    .insert({ clase_id: claseId, alumno_id: user.id, fecha, comentario });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/alumno/inscripciones");
  return { status: "success", message: "Gracias, tu comentario quedó registrado." };
}
