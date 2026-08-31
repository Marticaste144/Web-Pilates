"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";

// Ambas acciones son compartidas entre /admin/alumnos/[id] y
// /profesor/alumnas/[id] -- la RLS decide sola si quien llama puede tocar la
// ficha de ese alumno (admin: cualquiera: profesor: solo la de sus alumnos
// visibles); acá no hace falta duplicar ese chequeo.

function revalidarFicha(alumnoId: string) {
  revalidatePath(`/admin/alumnos/${alumnoId}`);
  revalidatePath(`/profesor/alumnas/${alumnoId}`);
}

// Upsert por alumno_id: siempre hay a lo sumo una ficha por alumno.
// updated_at y actualizado_por quedan como "última actualización" -- no se
// versiona el campo en sí (para eso está el historial de notas, aparte).
export async function guardarFicha(_prevState: FormState, formData: FormData): Promise<FormState> {
  const alumnoId = String(formData.get("alumno_id") ?? "");
  const doloresMolestias = String(formData.get("dolores_molestias") ?? "").trim();

  if (!alumnoId) {
    return { status: "error", message: "Falta identificar al alumno." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("fichas_evaluacion")
    .upsert(
      { alumno_id: alumnoId, dolores_molestias: doloresMolestias || null, actualizado_por: user?.id ?? null },
      { onConflict: "alumno_id" },
    );

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidarFicha(alumnoId);
  return { status: "success", message: "Ficha guardada." };
}

// Append-only: una nota nueva, fechada a hoy -- nunca se editan ni se borran
// las anteriores (sin policy de update/delete a propósito, ver migración).
export async function agregarNotaEvolucion(_prevState: FormState, formData: FormData): Promise<FormState> {
  const alumnoId = String(formData.get("alumno_id") ?? "");
  const contenido = String(formData.get("contenido") ?? "").trim();

  if (!alumnoId) {
    return { status: "error", message: "Falta identificar al alumno." };
  }
  if (!contenido) {
    return { status: "error", message: "Escribí una nota antes de guardar." };
  }
  if (contenido.length > 2000) {
    return { status: "error", message: "La nota es demasiado larga (máx. 2000 caracteres)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("ficha_evaluacion_notas").insert({
    alumno_id: alumnoId,
    autor_id: user?.id ?? null,
    contenido,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidarFicha(alumnoId);
  return { status: "success", message: "Nota agregada." };
}
