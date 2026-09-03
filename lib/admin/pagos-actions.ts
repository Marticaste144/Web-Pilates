"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { calcularMontoCuotaSede } from "@/lib/pagos-calculo-server";

export type PagoResult = { ok: boolean; message: string };

// Aprueba a mano un pago ya existente que quedó "pendiente"/"procesando".
// No fuerza el medio -- lo deja como ya estaba cargado (antes esto pisaba
// medio='efectivo' sin condición, lo que podía relabelear mal un pago por
// transferencia si se usaba este botón genérico en vez del de "Aprobar
// comprobante"; ahora respeta el medio real de la fila). No hace falta
// calcular aprobado_en/vencimiento ni escribir pagos_auditoria acá -- lo
// hacen los triggers trg_pagos_calcular_vencimiento y
// trg_registrar_auditoria_pago en cuanto estado pasa a 'aprobado'. Pensado
// para el botón genérico "Aprobar" del panel de Pagos -- para comprobantes
// de transferencia con estado 'pendiente', ver aprobarComprobante más abajo
// (mismo criterio de no forzar medio, y valida que siga pendiente antes de
// tocarlo).
export async function aprobarPagoEfectivo(pagoId: string, alumnoId: string): Promise<PagoResult> {
  const admin = await requireAdminProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("pagos")
    .update({
      estado: "aprobado",
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

// Cubre el caso de un alumno que paga en efectivo en el local. Inserta una
// fila NUEVA en pagos (cada pago es una fila propia, nunca se pisa una
// existente), ya con estado='aprobado' -- fn_calcular_vencimiento_pago
// (paso 2) calcula aprobado_en/vencimiento solo, igual que con cualquier
// pago que pasa a aprobado, sea cual sea el
// medio. marcado_por/marcado_en quedan como registro de quién y cuándo lo
// marcó pagado manualmente.
//
// El monto usa la MISMA lógica que subirComprobantePago (por actividad,
// combo 20% off y prorrateo -- ver lib/pagos-calculo-server.ts): antes este
// cálculo era independiente y buscaba el arancel por sede_id, que ya no
// existe para las sedes migradas al modelo por actividad (quedaba
// "No hay un arancel definido..." aunque el precio sí existiera).
//
// Dos componentes disparan esta misma operación bajo nombres históricos
// distintos (MarcarEfectivoButton, en la card "Cuota por sede", y el panel
// de Pagos, más nuevo) -- en vez de mantener dos implementaciones que
// puedan divergir, marcarPagoEfectivo de más abajo es un alias de esta.
export async function registrarPagoEfectivo(alumnoId: string, sedeId: string): Promise<PagoResult> {
  const admin = await requireAdminProfile();
  const supabase = await createClient();

  const calculo = await calcularMontoCuotaSede(supabase, alumnoId, sedeId);
  if (!calculo.ok) {
    return { ok: false, message: calculo.message };
  }
  const { monto, actividadesIds, frecuenciaSemanal, periodoMes } = calculo;

  const { error } = await supabase.from("pagos").insert({
    alumno_id: alumnoId,
    sede_id: sedeId,
    actividades_ids: actividadesIds,
    periodo_mes: periodoMes,
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
  return {
    ok: true,
    message: `Pago registrado como efectivo por $${monto.toLocaleString("es-AR")} -- la cuota ya está al día.`,
  };
}

// Alias: MarcarEfectivoButton (card "Cuota por sede") dispara esta misma
// operación bajo un nombre más viejo -- mismo flujo que "Registrar y
// aprobar" del panel de Pagos, no dos implementaciones separadas.
export const marcarPagoEfectivo = registrarPagoEfectivo;

// Aprueba un pago que el alumno dejó "pendiente" al subir un comprobante
// (lib/alumno/comprobante-actions.ts) -- a diferencia de registrarPagoEfectivo
// de arriba, ACTUALIZA esa fila puntual en vez de crear una nueva, porque ya
// existe (con su comprobante_url) y solo hace falta confirmarla. Al ser un
// UPDATE (no un INSERT) sí dispara fn_registrar_auditoria_pago (paso 3), que
// deja registrado el cambio pendiente -> aprobado en pagos_auditoria además
// de marcado_por/marcado_en acá.
//
// El WHERE por estado='pendiente' es a propósito: evita reprocesar un pago
// que ya se resolvió por otra vía (ej. si el mismo alumno terminó pagando
// por Mercado Pago aparte) y da un mensaje claro en vez de un "éxito" que en
// realidad no cambió nada. A diferencia de aprobarPagoEfectivo, no fuerza
// medio -- el comprobante ya tiene el suyo (transferencia).
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
  revalidatePath("/admin/comprobantes");
  return {
    ok: true,
    message: `Comprobante aprobado por $${pago.monto.toLocaleString("es-AR")} -- la cuota ya está al día.`,
  };
}

// Rechaza un comprobante que no corresponde (monto equivocado, transferencia
// que no llegó, etc.) -- mismo criterio que aprobarComprobante (UPDATE de la
// fila existente, no borrado: pagos nunca se borra, queda como historial).
// El WHERE por estado='pendiente' evita reprocesar un comprobante que ya se
// resolvió por otra vía.
export async function rechazarComprobante(pagoId: string): Promise<PagoResult> {
  const admin = await requireAdminProfile();
  const supabase = await createClient();

  const { data: pago, error } = await supabase
    .from("pagos")
    .update({ estado: "rechazado", marcado_por: admin.id, marcado_en: new Date().toISOString() })
    .eq("id", pagoId)
    .eq("estado", "pendiente")
    .select("alumno_id")
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
  revalidatePath("/admin/comprobantes");
  return { ok: true, message: "Comprobante rechazado. El alumno puede subir uno nuevo." };
}
