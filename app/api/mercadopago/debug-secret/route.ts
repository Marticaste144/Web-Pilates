import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

// ⚠️ ENDPOINT TEMPORAL DE DIAGNÓSTICO -- SACAR ANTES DE CERRAR EL PASO 5d. ⚠️
// Sirve para confirmar, sin que el secreto real circule nunca por ningún
// lado (chat, logs, etc.), si el MERCADOPAGO_WEBHOOK_SECRET que está leyendo
// esta app en runtime es el mismo que el que tenés guardado vos afuera:
// calcula el HMAC-SHA256 de un string fijo y conocido con ese secreto, y
// devuelve solo el hash. Vos calculás el mismo HMAC de tu lado (con tu copia
// del secreto) y comparás -- si coinciden, el runtime tiene la clave que
// creés que tiene.
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

  const hash = createHmac("sha256", secret).update(STRING_FIJO).digest("hex");

  return NextResponse.json({
    ok: true,
    input: STRING_FIJO,
    secretLength: secret.length,
    hmacSha256: hash,
  });
}
