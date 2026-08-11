import { NextResponse, type NextRequest } from "next/server";
import { Payment } from "mercadopago";
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";
import { getMercadoPagoConfig } from "@/lib/mercadopago/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoPago } from "@/types/database";

function mapearEstado(mpStatus: string | undefined): EstadoPago {
  switch (mpStatus) {
    case "approved":
      return "aprobado";
    case "rejected":
    case "cancelled":
      return "rechazado";
    case "in_process":
    case "in_mediation":
      return "procesando";
    default:
      return "pendiente";
  }
}

// Mercado Pago llama acá cuando cambia el estado de un pago. Nunca hay
// sesión de usuario en este request (es servidor-a-servidor), así que usa
// el cliente con service_role -- y por eso mismo NUNCA hay que confiar en
// el body de la notificación tal cual: siempre se vuelve a consultar el
// pago por la API autenticada de Mercado Pago antes de tocar la base.
export async function POST(request: NextRequest) {
  let dataId = request.nextUrl.searchParams.get("data.id") ?? request.nextUrl.searchParams.get("id");

  let body: { data?: { id?: string } } | null = null;
  try {
    body = await request.json();
  } catch {
    // Los webhooks viejos de Mercado Pago mandan todo por query string.
  }
  dataId = body?.data?.id ?? dataId;

  if (!dataId) {
    return NextResponse.json({ ok: true });
  }

  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (webhookSecret) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: request.headers.get("x-signature"),
        xRequestId: request.headers.get("x-request-id"),
        dataId,
        secret: webhookSecret,
        toleranceSeconds: 300,
      });
    } catch (err) {
      const reason = err instanceof InvalidWebhookSignatureError ? err.reason : "desconocido";
      console.error("Webhook de Mercado Pago con firma inválida", reason);
      return NextResponse.json({ error: "firma inválida" }, { status: 401 });
    }
  } else {
    // MERCADOPAGO_WEBHOOK_SECRET sin configurar: no se puede verificar la
    // firma (ver README para configurarlo). Igual es seguro seguir, porque
    // más abajo se vuelve a pedir el pago por la API autenticada -- nadie
    // puede forjar qué contesta Mercado Pago ahí.
    console.warn("MERCADOPAGO_WEBHOOK_SECRET no configurado: firma del webhook sin verificar");
  }

  let payment;
  try {
    const paymentClient = new Payment(getMercadoPagoConfig());
    payment = await paymentClient.get({ id: dataId });
  } catch (err) {
    console.error("No se pudo consultar el pago en Mercado Pago", err);
    return NextResponse.json({ error: "No se pudo consultar el pago" }, { status: 502 });
  }

  const pagoId = payment.external_reference;
  if (!pagoId) {
    // No es un pago generado por esta app (ej. de otra preferencia vieja).
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("pagos")
    .update({
      estado: mapearEstado(payment.status),
      mercadopago_payment_id: String(payment.id ?? dataId),
    })
    .eq("id", pagoId);

  if (error) {
    console.error("No se pudo actualizar el pago desde el webhook", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
