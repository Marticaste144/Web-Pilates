// Sin fallback silencioso a propósito: un default tipo "http://localhost:3000"
// acá adentro es una bomba de tiempo -- si NEXT_PUBLIC_SITE_URL no llegara a
// estar disponible en producción (ej. se agregó en Vercel después de un
// build y todavía no corrió un build nuevo, ya que las env vars
// NEXT_PUBLIC_* se inyectan en el bundle en build-time, no en runtime),
// mejor que explote acá con un mensaje claro que mandar un link roto en un
// email o un back_url en http:// que Mercado Pago rechaza silenciosamente
// con un error que no dice nada de esto.
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;

  if (!raw || !raw.trim()) {
    throw new Error(
      "Falta NEXT_PUBLIC_SITE_URL. Si esto pasa en producción, probablemente la variable se agregó " +
        "después del último build -- hace falta un build nuevo (no alcanza con “Redeploy” reusando el build viejo).",
    );
  }

  // trim() por si quedó un espacio/salto de línea pegado al copiar el valor
  // en el dashboard de Vercel; replace() saca la barra final si la tiene,
  // para que sumarle "/algo" nunca genere "//algo".
  return raw.trim().replace(/\/+$/, "");
}
