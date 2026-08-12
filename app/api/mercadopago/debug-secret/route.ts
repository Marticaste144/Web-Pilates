import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";

// ⚠️ ENDPOINT TEMPORAL DE DIAGNÓSTICO -- SACAR ANTES DE CERRAR EL PASO 5d. ⚠️
// Sirve para confirmar, sin que el secreto real circule nunca por ningún
// lado (chat, logs, etc.), si el MERCADOPAGO_WEBHOOK_SECRET que está leyendo
// esta app en runtime es el mismo que el que tenés guardado vos afuera:
// GET calcula el HMAC-SHA256 de un string fijo y conocido con ese secreto, y
// devuelve solo el hash. Vos calculás el mismo HMAC de tu lado (con tu copia
// del secreto) y comparás -- si coinciden, el runtime tiene la clave que
// creés que tiene. POST con { "manifest": "..." } hace lo mismo pero con un
// manifest real (el que logueó /api/mercadopago/webhook), para confirmar con
// el mismo código que corre en producción si ESE hash matchea la firma real
// de Mercado Pago -- sin depender de un cálculo manual hecho a mano.
//
// Protegido con MERCADOPAGO_DEBUG_TOKEN: si esa env var no está seteada, o
// el token que mandaste no matchea, el endpoint responde 404 (como si no
// existiera) en vez de 401, para no ni siquiera confirmar que existe.
const STRING_FIJO = "test-verificacion";

function tokenValido(request: NextRequest): boolean {
  // .trim(): mismo motivo que en el resto de esta investigación -- pegar en
  // el dashboard de Vercel puede dejar un espacio/salto de línea de más.
  const tokenEsperado = process.env.MERCADOPAGO_DEBUG_TOKEN?.trim();
  if (!tokenEsperado) return false;

  const tokenRecibido = (
    request.headers.get("x-debug-token") ?? request.nextUrl.searchParams.get("token")
  )?.trim();
  if (!tokenRecibido) return false;

  const a = Buffer.from(tokenEsperado);
  const b = Buffer.from(tokenRecibido);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function calcular(secret: string, input: string) {
  return NextResponse.json({
    ok: true,
    input,
    secretLength: secret.length,
    hmacSha256: createHmac("sha256", secret).update(input).digest("hex"),
  });
}

// Misma lógica que /api/mercadopago/webhook -- duplicada acá a propósito
// (este archivo entero es temporal) para armar el manifest a partir de
// piezas sueltas pasadas por query string, sin que el cliente tenga que
// mandar un string ya armado con ":"/";" adentro de un body JSON -- eso
// obliga a escapar bien en PowerShell/curl y es una fuente de errores de
// transcripción que no tiene nada que ver con el bug real que se está
// buscando.
function armarManifest(dataId: string, xRequestId: string | null, ts: string | null): string {
  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId}`);
  if (xRequestId) parts.push(`request-id:${xRequestId}`);
  if (ts) parts.push(`ts:${ts}`);
  return parts.join(";") + ";";
}

export async function GET(request: NextRequest) {
  if (!tokenValido(request)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, message: "MERCADOPAGO_WEBHOOK_SECRET no está configurado en este entorno." },
      { status: 200 },
    );
  }

  const dataId = request.nextUrl.searchParams.get("dataId");
  const xRequestId = request.nextUrl.searchParams.get("xRequestId");
  const ts = request.nextUrl.searchParams.get("ts");
  const xSignature = request.nextUrl.searchParams.get("xSignature");

  // Si viene xSignature, se corre el validador REAL (el mismo que usa
  // /api/mercadopago/webhook) contra estos valores -- la prueba más
  // autoritativa posible, porque es literalmente el mismo código, no una
  // reimplementación para diagnóstico.
  if (xSignature) {
    try {
      WebhookSignatureValidator.validate({
        xSignature,
        xRequestId,
        dataId: dataId ?? "",
        secret,
        toleranceSeconds: 10 ** 9, // no importa el drift de reloj para este test puntual
      });
      return NextResponse.json({ ok: true, validatorReal: "PASÓ" });
    } catch (err) {
      const reason = err instanceof InvalidWebhookSignatureError ? err.reason : "desconocido";
      return NextResponse.json({
        ok: false,
        validatorReal: "FALLÓ",
        reason,
        manifest: armarManifest(dataId ?? "", xRequestId, ts),
        hmacSha256Calculado: createHmac("sha256", secret)
          .update(armarManifest(dataId ?? "", xRequestId, ts))
          .digest("hex"),
      });
    }
  }

  if (dataId || xRequestId || ts) {
    return calcular(secret, armarManifest(dataId ?? "", xRequestId, ts));
  }

  return calcular(secret, STRING_FIJO);
}

// POST con body { "manifest": "..." } -- para probar el HMAC de un manifest
// REAL (el que logueó el webhook en un intento fallido), calculado con el
// mismo código (createHmac de Node, mismo secreto ya confirmado) que corre
// en la ruta real. Sirve para descartar que un cálculo manual hecho a mano
// (ej. en PowerShell) tenga un bug de encoding/salto de línea de más -- si
// el manifest logueado por /api/mercadopago/webhook produce acá un hash que
// tampoco matchea el x-signature real de Mercado Pago, el problema ya no
// puede ser "cómo lo calculé a mano", tiene que ser el secreto/manifest en
// sí (otra aplicación firmando, otro secreto vigente del lado de MP, etc.).
export async function POST(request: NextRequest) {
  if (!tokenValido(request)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, message: "MERCADOPAGO_WEBHOOK_SECRET no está configurado en este entorno." },
      { status: 200 },
    );
  }

  let body: { manifest?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    // body inválido -- se usa el string fijo por default más abajo.
  }

  return calcular(secret, body?.manifest || STRING_FIJO);
}
