"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";

// Fila única (id=true) -- ver migración 20260815100000_configuracion_pagos.sql.
// Nunca se inserta una fila nueva, siempre UPDATE de la existente.
export async function actualizarConfiguracionPagos(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminProfile();

  const recargoPct = Number(formData.get("recargo_mercadopago_pct"));
  const alias = String(formData.get("alias_transferencia") ?? "").trim();
  const cbu = String(formData.get("cbu_transferencia") ?? "").trim();
  const titular = String(formData.get("titular_transferencia") ?? "").trim();

  if (Number.isNaN(recargoPct) || recargoPct < 0 || recargoPct >= 100) {
    return { status: "error", message: "El recargo tiene que ser un número entre 0 y 100." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("configuracion_pagos")
    .update({
      recargo_mercadopago_pct: recargoPct,
      alias_transferencia: alias || null,
      cbu_transferencia: cbu || null,
      titular_transferencia: titular || null,
    })
    .eq("id", true);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin/aranceles");
  revalidatePath("/alumno/cuota");
  return { status: "success", message: "Configuración guardada." };
}
