"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type PagoActionResult = { ok: boolean; message: string };

// Aprueba a mano un pago (efectivo, o Mercado Pago que nunca confirmó por
// webhook). No hace falta calcular aprobado_en/vencimiento ni escribir
// pagos_auditoria acá -- lo hacen los triggers trg_pagos_calcular_vencimiento
// y trg_registrar_auditoria_pago en cuanto estado pasa a 'aprobado'.
export async function aprobarPagoEfectivo(pagoId: string, alumnoId: string): Promise<PagoActionResult> {
  const admin = await requireAdminProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("pagos")
    .update({
      estado: "aprobado",
      medio: "efectivo",
      marcado_por: admin.id,
      marcado_en: new Date().toISOString(),
    })
    .eq("id", pagoId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/admin/alumnos/${alumnoId}`);
  return { ok: true, message: "Pago aprobado." };
}

// Carga y aprueba de una un pago en efectivo que nunca pasó por Mercado
// Pago (el alumno pagó en el mostrador). Mismo cálculo de frecuencia/monto
// que iniciarPagoMercadoPago (lib/alumno/pago-actions.ts), pero sin pasar
// por Checkout Pro: el pago se crea ya 'aprobado'.
export async function registrarPagoEfectivo(alumnoId: string, sedeId: string): Promise<PagoActionResult> {
  const admin = await requireAdminProfile();
  const supabase = await createClient();

  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("clase_id")
    .eq("alumno_id", alumnoId)
    .eq("estado", "activa");

  const claseIds = [...new Set((inscripciones ?? []).map((i) => i.clase_id))];
  if (claseIds.length === 0) {
    return { ok: false, message: "El alumno no tiene clases activas en ninguna sede." };
  }

  const { data: clases } = await supabase.from("clases").select("id, sede_id").in("id", claseIds);
  const frecuenciaSemanal = (clases ?? []).filter((c) => c.sede_id === sedeId).length;

  if (frecuenciaSemanal === 0) {
    return { ok: false, message: "El alumno no tiene clases activas en esta sede." };
  }

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const { data: arancelRows } = await supabase
    .from("aranceles")
    .select("valor_mensual, vigente_desde")
    .eq("sede_id", sedeId)
    .eq("clases_por_semana", frecuenciaSemanal)
    .lte("vigente_desde", hoy)
    .order("vigente_desde", { ascending: false })
    .limit(1);

  const monto = arancelRows?.[0]?.valor_mensual;
  if (!monto) {
    return { ok: false, message: "No hay un arancel definido para esta frecuencia todavía." };
  }

  const { error } = await supabase.from("pagos").insert({
    alumno_id: alumnoId,
    sede_id: sedeId,
    frecuencia_semanal: frecuenciaSemanal,
    monto,
    medio: "efectivo",
    estado: "aprobado",
    marcado_por: admin.id,
    marcado_en: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/admin/alumnos/${alumnoId}`);
  return { ok: true, message: "Pago en efectivo registrado y aprobado." };
}
