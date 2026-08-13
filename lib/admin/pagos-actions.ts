"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type PagoResult = { ok: boolean; message: string };

// Cubre el caso de un alumno que paga en efectivo en el local -- hasta ahora
// la única forma de que una cuota pasara a "al día" era el webhook de
// Mercado Pago. Inserta una fila NUEVA en pagos (mismo criterio que
// iniciarPagoMercadoPago en lib/alumno/pago-actions.ts: cada pago es una
// fila propia, nunca se pisa una existente), ya con estado='aprobado' --
// fn_calcular_vencimiento_pago (paso 2) calcula aprobado_en/vencimiento
// solo, igual que con cualquier pago que pasa a aprobado, sea cual sea el
// medio. marcado_por/marcado_en (columnas que ya existían en el esquema
// desde el paso 5d, pensadas para esto) quedan como registro de quién lo
// marcó y cuándo, para distinguirlo de una aprobación real de Mercado Pago.
//
// A propósito NO toca lib/alumno/pago-actions.ts ni el webhook -- este es
// un camino totalmente aparte, así que no hay riesgo de romper el flujo de
// Mercado Pago que ya funciona.
export async function marcarPagoEfectivo(alumnoId: string, sedeId: string): Promise<PagoResult> {
  const admin = await requireAdminProfile();

  const supabase = await createClient();

  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("clase_id")
    .eq("alumno_id", alumnoId)
    .eq("estado", "activa");

  const claseIds = [...new Set((inscripciones ?? []).map((i) => i.clase_id))];
  if (claseIds.length === 0) {
    return { ok: false, message: "Este alumno no tiene clases activas en ninguna sede." };
  }

  const { data: clases } = await supabase.from("clases").select("id, sede_id").in("id", claseIds);
  const frecuenciaSemanal = (clases ?? []).filter((c) => c.sede_id === sedeId).length;

  if (frecuenciaSemanal === 0) {
    return { ok: false, message: "Este alumno no tiene clases activas en esta sede." };
  }

  const hoy = new Date().toISOString().slice(0, 10);
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
  revalidatePath("/admin/alumnos");
  revalidatePath("/admin");
  return { ok: true, message: `Pago registrado como efectivo por $${monto.toLocaleString("es-AR")} -- la cuota ya está al día.` };
}

// Aprueba un pago que el alumno dejó "pendiente" al subir un comprobante
// (lib/alumno/comprobante-actions.ts) -- a diferencia de marcarPagoEfectivo
// de arriba, ACTUALIZA esa fila puntual en vez de crear una nueva, porque ya
// existe (con su comprobante_url) y solo hace falta confirmarla. Al ser un
// UPDATE (no un INSERT) sí dispara fn_registrar_auditoria_pago (paso 3),
// que deja registrado el cambio pendiente -> aprobado en pagos_auditoria
// además de marcado_por/marcado_en acá.
//
// El WHERE por estado='pendiente' es a propósito: evita reprocesar un pago
// que ya se resolvió por otra vía (ej. si el mismo alumno terminó pagando
// por Mercado Pago aparte) y da un mensaje claro en vez de un "éxito" que
// en realidad no cambió nada.
export async function aprobarComprobante(pagoId: string): Promise<PagoResult> {
  const admin = await requireAdminProfile();

  const supabase = await createClient();

  const { data: pago, error } = await supabase
    .from("pagos")
    .update({ estado: "aprobado", marcado_por: admin.id, marcado_en: new Date().toISOString() })
    .eq("id", pagoId)
    .eq("estado", "pendiente")
    .select("alumno_id, monto")
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }
  if (!pago) {
    return { ok: false, message: "Este comprobante ya fue revisado (o no está pendiente)." };
  }

  revalidatePath(`/admin/alumnos/${pago.alumno_id}`);
  revalidatePath("/admin/alumnos");
  revalidatePath("/admin");
  return { ok: true, message: `Comprobante aprobado por $${pago.monto.toLocaleString("es-AR")} -- la cuota ya está al día.` };
}
