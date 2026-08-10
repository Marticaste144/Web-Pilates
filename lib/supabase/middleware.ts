import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

// Refresca el token de sesión de Supabase en cada request. La lógica de
// redirección por rol (admin / profesor / alumno) se agrega en el paso 3,
// junto con la autenticación.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    // Todavía no se configuró .env.local (ver README) — no rompemos el
    // resto de la app mientras tanto, solo dejamos pasar la request.
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // No borrar: getUser() revalida el token contra Supabase Auth y renueva
  // las cookies si hace falta. No reemplazar por getSession().
  await supabase.auth.getUser();

  return supabaseResponse;
}
