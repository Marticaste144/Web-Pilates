"use server";

import { redirect } from "next/navigation";
import { Preference } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { getMercadoPagoConfig } from "@/lib/mercadopago/client";
import { getSiteUrl } from "@/lib/site-url";
import { obtenerConfiguracionPagos } from "@/lib/configuracion-pagos";
import { calcularRecargoMercadoPago } from "@/lib/recargo-mercadopago";

export type PagoResult = { ok: boolean; message: string };

// Crea el registro de pago (estado='pendiente') y una preferencia de
// Checkout Pro, y redirige al alumno a la pasarela de Mercado Pago. Si algo
// falla ANTES de llegar a Mercado Pago, devuelve un mensaje en vez de
// redirigir. La aprobación real del pago no pasa por acá -- llega después,
// asincrónicamente, por el webhook (/api/mercadopago/webhook).
export async function iniciarPagoMercadoPago(sedeId: string): Promise<PagoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Iniciá sesión de nuevo." };
  }

  // Frecuencia semanal = cantidad de clases activas del alumno en esta
  // sede (no un dato que se elige a mano, sale de sus inscripciones reales).
  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("clase_id")
    .eq("estado", "activa");

  const claseIds = [...new Set((inscripciones ?? []).map((i) => i.clase_id))];
  if (claseIds.length === 0) {
    return { ok: false, message: "No tenés clases activas en ninguna sede." };
  }

  const { data: clases } = await supabase.from("clases").select("id, sede_id").in("id", claseIds);
  const frecuenciaSemanal = (clases ?? []).filter((c) => c.sede_id === sedeId).length;

  if (frecuenciaSemanal === 0) {
    return { ok: false, message: "No tenés clases activas en esta sede." };
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

  const { data: sede } = await supabase.from("sedes").select("nombre").eq("id", sedeId).single();

  // "monto" sigue siendo siempre el valor neto de la cuota (lo que le
  // corresponde a MUV) -- el recargo de Mercado Pago se guarda aparte en
  // recargo_mercadopago, y es lo único que cambia respecto de lo que se le
  // cobra al alumno (ver lib/configuracion-pagos.ts para la fórmula).
  const config = await obtenerConfiguracionPagos();
  const recargo = calcularRecargoMercadoPago(monto, config.recargoMercadopagoPct);
  const montoConRecargo = monto + recargo;

  const { data: pago, error: errorPago } = await supabase
    .from("pagos")
    .insert({
      alumno_id: user.id,
      sede_id: sedeId,
      frecuencia_semanal: frecuenciaSemanal,
      monto,
      recargo_mercadopago: recargo,
      medio: "mercadopago",
      estado: "pendiente",
    })
    .select("id")
    .single();

  if (errorPago || !pago) {
    return { ok: false, message: errorPago?.message ?? "No se pudo iniciar el pago." };
  }

  let siteUrl: string;
  try {
    siteUrl = getSiteUrl();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falta configurar la URL del sitio.";
    return { ok: false, message };
  }

  let checkoutUrl: string | undefined;
  try {
    const preference = new Preference(getMercadoPagoConfig());
    const result = await preference.create({
      body: {
        items: [
          {
            id: pago.id,
            title: `Cuota MUV ${sede?.nombre ?? ""} -- ${frecuenciaSemanal}x/semana`,
            quantity: 1,
            unit_price: montoConRecargo,
            currency_id: "ARS",
          },
        ],
        external_reference: pago.id,
        back_urls: {
          success: `${siteUrl}/alumno/cuota?pago=exito`,
          failure: `${siteUrl}/alumno/cuota?pago=fallo`,
          pending: `${siteUrl}/alumno/cuota?pago=pendiente`,
        },
        auto_return: "approved",
        notification_url: `${siteUrl}/api/mercadopago/webhook`,
      },
    });
    checkoutUrl = result.init_point;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido de Mercado Pago.";
    return { ok: false, message: `No se pudo iniciar el pago con Mercado Pago: ${message}` };
  }

  if (!checkoutUrl) {
    return { ok: false, message: "Mercado Pago no devolvió un link de pago." };
  }

  redirect(checkoutUrl);
}
