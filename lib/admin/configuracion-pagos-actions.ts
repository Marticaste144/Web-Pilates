"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";

// Fila única (id=true) -- ver migración 20260815100000_configuracion_pagos.sql.
// Nunca se inserta una fila nueva, siempre UPDATE de la existente. Ya no se
// toca recargo_mercadopago_pct (se dejó de integrar Mercado Pago) -- esa
// columna queda en la base solo por compatibilidad con pagos históricos.
export async function actualizarConfiguracionPagos(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminProfile();

  const alias = String(formData.get("alias_transferencia") ?? "").trim();
  const cbu = String(formData.get("cbu_transferencia") ?? "").trim();
  const titular = String(formData.get("titular_transferencia") ?? "").trim();
  const aliasMercadopago = String(formData.get("alias_mercadopago") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("configuracion_pagos")
    .update({
      alias_transferencia: alias || null,
      cbu_transferencia: cbu || null,
      titular_transferencia: titular || null,
      alias_mercadopago: aliasMercadopago || null,
    })
    .eq("id", true);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin/aranceles");
  revalidatePath("/alumno/cuota");
  return { status: "success", message: "Configuración guardada." };
}
