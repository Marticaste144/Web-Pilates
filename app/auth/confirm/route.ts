import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase manda acá el link de los emails de recuperación de contraseña
// (y de confirmación de cuenta, si está activada). Intercambia el "code"
// de la URL por una sesión real antes de mandar al usuario a la pantalla
// que corresponda -- sin este paso, /reset-password lo recibiría sin
// sesión y no podría guardar la contraseña nueva.
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
