import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// SIN USO ACTUALMENTE (dejado a propósito, no se pudo borrar el archivo en
// esta sesión). La recuperación de contraseña dejó de apuntar acá: usaba
// esto vía resetPasswordForEmail(), pero ese flujo entrega los tokens en el
// HASH de la URL (#access_token=...), que solo el navegador puede leer --
// este endpoint, al solo saber leer ?code=, nunca recibía nada usable y
// todo intento de recuperación terminaba silenciosamente en /login. La
// recuperación ahora reusa /auth/confirm-invite (ver lib/auth/actions.ts,
// requestPasswordReset), el mismo mecanismo ya probado para invitaciones.
// Este archivo puede borrarse con seguridad si no queda nada más
// apuntándole (confirmado: no queda nada al momento de este comentario).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
