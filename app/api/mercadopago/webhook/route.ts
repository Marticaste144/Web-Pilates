import { createHmac } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { Payment } from "mercadopago";
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";
import { getMercadoPagoConfig } from "@/lib/mercadopago/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoPago } from "@/types/database";

// Solo para diagnóstico en el log de abajo -- replica (no reemplaza) el
// parseo/armado que hace WebhookSignatureValidator internamente, para poder
// mostrar el manifest en texto plano sin tener que exportar nada del SDK.
function extraerDeXSignature(xSignature: string | null, key: "ts" | "v1"): string | undefined {
  if (!xSignature) return undefined;
  for (const part of xSignature.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const partKey = part.substring(0, eq).trim().toLowerCase();
    const value = part.substring(eq + 1).trim();
    if (partKey === key && value) return value;
  }
  return undefined;
}

// Replica byte a byte buildManifest() de node_modules/mercadopago/dist/utils/webhook/index.js
// (confirmado leyendo el fuente compilado): "ts:" se agrega SIEMPRE, a
// diferencia de "id:"/"request-id:" que son condicionales. Antes de este fix
// acá también era condicional -- no afectaba a la validación real (que corre
// aparte, con el validador del SDK), pero sí podía hacer que el manifest
// logueado (y el HMAC calculado en paralelo para comparar) no coincidiera
// con lo que el SDK realmente usa, en el caso límite de un ts vacío.
function armarManifest(dataId: string, xRequestId: string | null, ts: string | undefined): string {
  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId}`);
  if (xRequestId) parts.push(`request-id:${xRequestId}`);
  parts.push(`ts:${ts}`);
  return parts.join(";") + ";";
}

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
  // Mercado Pago manda notificaciones de varios "topics" a la misma
  // notification_url -- no solo "payment". En particular "merchant_order"
  // es un feed viejo (IPN de "Merchant Orders") que llega en paralelo al de
  // payment, y Mercado Pago documenta explícitamente que esas notificaciones
  // NO se pueden validar con x-signature (la firma nunca va a matchear, sin
  // importar qué secreto uses). Como acá solo nos importa el estado de un
  // pago (y el id que manda merchant_order ni siquiera es un id de pago
  // válido para Payment.get), se ignoran de una todos los topics que no
  // sean "payment", antes de intentar validar firma o consultar nada.
  const topic = request.nextUrl.searchParams.get("type") ?? request.nextUrl.searchParams.get("topic");
  if (topic && topic !== "payment") {
    return NextResponse.json({ ok: true });
  }

  // La firma se calcula del lado de Mercado Pago con el data.id que va en la
  // URL de notificación -- por eso ESE es el valor autoritativo para validar
  // (no el del body). Si no viene por query string (webhooks viejos),
  // recién ahí se usa el del body como fallback.
  const dataIdFromQuery =
    request.nextUrl.searchParams.get("data.id") ?? request.nextUrl.searchParams.get("id");

  let body: { data?: { id?: string } } | null = null;
  try {
    body = await request.json();
  } catch {
    // Los webhooks viejos de Mercado Pago mandan todo por query string.
  }
  const dataId = (dataIdFromQuery ?? body?.data?.id)?.toLowerCase();

  if (!dataId) {
    return NextResponse.json({ ok: true });
  }

  // .trim(): copiar/pegar una env var en el dashboard de Vercel a veces deja
  // un espacio o salto de línea de más -- ya nos pasó exactamente esto con
  // NEXT_PUBLIC_SITE_URL (ver más abajo). Un secreto con un byte de más
  // cambia el HMAC calculado sin que se note a simple vista comparándolo
  // "a ojo" contra lo que muestra el panel de Mercado Pago.
  const rawWebhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const webhookSecret = rawWebhookSecret?.trim();
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
      // Se loguea todo lo necesario para diagnosticar sin tener que
      // reproducir el request: la razón puntual (ver SignatureFailureReason
      // en el SDK), los valores crudos que se usaron para armar el
      // manifest, y el LARGO (no el valor) del secreto leído en runtime --
      // para comparar contra el largo real de la clave copiada sin exponer
      // el secreto en los logs. "SignatureMismatch" casi siempre es un
      // secreto incorrecto (modo prueba vs producción, o con espacios de
      // más); "TimestampOutOfTolerance" es reloj/reintento tardío;
      // "MissingSignatureHeader"/"MalformedSignatureHeader" es un problema
      // de infraestructura (proxy que pisa headers, etc.).
      const xSignatureHeader = request.headers.get("x-signature");
      const xRequestIdHeader = request.headers.get("x-request-id");
      const ts = extraerDeXSignature(xSignatureHeader, "ts");
      const manifest = armarManifest(dataId, xRequestIdHeader, ts);
      // Cálculo del HMAC hecho acá mismo, en paralelo al del SDK -- si
      // "coincide" da true, el bug NO es el secreto ni el manifest (algo
      // anda mal en la llamada al validador del SDK); si da false, confirma
      // que el runtime está firmando distinto a como Mercado Pago firmó, y
      // el secretPreview (nunca el secreto completo) ayuda a distinguir "el
      // secreto cargado en Vercel no es el que creo que es" de un bug de
      // otro tipo, sin exponerlo en texto plano en los logs.
      const firmaCalculadaAca = ts ? createHmac("sha256", webhookSecret).update(manifest).digest("hex") : undefined;
      const firmaRecibida = extraerDeXSignature(xSignatureHeader, "v1");
      console.error("Webhook de Mercado Pago con firma inválida", {
        reason,
        dataId,
        dataIdFromQuery,
        dataIdFromBody: body?.data?.id,
        xRequestId: xRequestIdHeader,
        xSignature: xSignatureHeader,
        secretLength: webhookSecret.length,
        secretLengthSinTrim: rawWebhookSecret?.length,
        secretPreview: `${webhookSecret.slice(0, 4)}...${webhookSecret.slice(-4)}`,
        // Texto plano exacto que se le pasa al HMAC -- comparar carácter a
        // carácter contra el ejemplo de la doc oficial de Mercado Pago.
        manifest,
        firmaRecibida,
        firmaCalculadaAca,
        firmasCoinciden: firmaCalculadaAca && firmaRecibida ? firmaCalculadaAca === firmaRecibida : undefined,
      });
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
