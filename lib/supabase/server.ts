import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

// Crea un cliente de Supabase para usar en Server Components, Server Actions
// y Route Handlers. Cada request necesita su propia instancia porque lee/escribe
// las cookies de la request actual.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Se llama desde un Server Component: el middleware ya se encarga
            // de refrescar la sesión, así que este error se puede ignorar.
          }
        },
      },
    },
  );
}
