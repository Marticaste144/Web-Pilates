"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";

export async function crearSuplencia(_prevState: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminProfile();

  const profesorOriginal = String(formData.get("profesor_original") ?? "");
  const profesorSuplente = String(formData.get("profesor_suplente") ?? "");
  const fechaInicio = String(formData.get("fecha_inicio") ?? "");
  const fechaFin = String(formData.get("fecha_fin") ?? "").trim();

  if (!profesorOriginal || !profesorSuplente || !fechaInicio) {
    return { status: "error", message: "Elegí ambos profesores y una fecha de inicio." };
  }
  if (profesorOriginal === profesorSuplente) {
    return { status: "error", message: "El profesor suplente no puede ser el mismo que el reemplazado." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("suplencias").insert({
    profesor_original: profesorOriginal,
    profesor_suplente: profesorSuplente,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin || null,
    creado_por: admin.id,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin/suplencias");
  return { status: "success", message: "Suplencia creada." };
}

// "Terminar" = activa=false, no un DELETE -- se conserva el historial de
// quién cubrió a quién y cuándo, mismo criterio que "activo" en profesores.
export async function terminarSuplencia(id: string): Promise<{ ok: boolean; message: string }> {
  await requireAdminProfile();

  const supabase = await createClient();
  const { error } = await supabase.from("suplencias").update({ activa: false }).eq("id", id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/suplencias");
  return { ok: true, message: "Suplencia finalizada -- el suplente pierde el acceso al instante." };
}
