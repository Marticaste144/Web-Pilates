"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";

// Fila única (id=true) -- ver migración 20260901120000_recuperacion_turnos.sql.
// Nunca se inserta una fila nueva, siempre UPDATE de la existente.
export async function actualizarConfiguracionRecuperaciones(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdminProfile();

  const max = Number(formData.get("max_recuperaciones_por_mes"));

  if (!Number.isInteger(max) || max < 0) {
    return { status: "error", message: "Ingresá un número entero mayor o igual a 0." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("configuracion_recuperaciones")
    .update({ max_recuperaciones_por_mes: max })
    .eq("id", true);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin/aranceles");
  return { status: "success", message: "Configuración guardada." };
}
