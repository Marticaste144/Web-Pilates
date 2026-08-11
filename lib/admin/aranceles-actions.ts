"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";

// Un "aumento" agrega una fila nueva con vigente_desde = hoy (no pisa el
// historial de precios viejos). Si ya se editó ese mismo combo hoy, el
// upsert actualiza esa fila de hoy en vez de duplicarla.
export async function actualizarArancel(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminProfile();

  const sedeId = String(formData.get("sede_id") ?? "");
  const clasesPorSemana = Number(formData.get("clases_por_semana"));
  const valorMensual = Number(formData.get("valor_mensual"));

  if (!sedeId || !clasesPorSemana || !valorMensual || valorMensual <= 0) {
    return { status: "error", message: "Ingresá un valor válido." };
  }

  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("aranceles").upsert(
    {
      sede_id: sedeId,
      clases_por_semana: clasesPorSemana,
      valor_mensual: valorMensual,
      vigente_desde: hoy,
    },
    { onConflict: "sede_id,clases_por_semana,vigente_desde" },
  );

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin/aranceles");
  return { status: "success", message: "Arancel actualizado." };
}
