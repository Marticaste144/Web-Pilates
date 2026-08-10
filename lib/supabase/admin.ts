import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Cliente con la service_role key: bypassa RLS por completo y es el único
// que puede usar supabase.auth.admin.* (ej. invitar profesores por email).
//
// NUNCA importar este archivo desde un Client Component ni exponer su
// resultado al browser -- solo se usa dentro de Server Actions que ya
// verificaron con requireRole("admin") que quien llama es admin de verdad.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
