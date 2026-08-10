import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RolUsuario } from "@/types/database";

export type CurrentProfile = {
  id: string;
  role: RolUsuario;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
};

const HOME_BY_ROLE: Record<RolUsuario, string> = {
  admin: "/admin",
  profesor: "/profesor",
  alumno: "/alumno",
};

export function homePathForRole(role: RolUsuario) {
  return HOME_BY_ROLE[role];
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // .env.local sin configurar todavía (ver README) -- se trata como "no
    // logueado" en vez de romper la app entera.
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, nombre, apellido, email, telefono")
    .eq("id", user.id)
    .single();

  return profile;
}

// Server Component helper: exige que haya sesión Y que el rol sea el
// esperado. Si no hay sesión manda a /login; si el rol no coincide, manda
// al home del rol que sí tiene (así un alumno que entra a /admin termina
// en /alumno, no en un error).
export async function requireRole(expected: RolUsuario): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== expected) {
    redirect(homePathForRole(profile.role));
  }

  return profile;
}

// Server Action helper: las Server Actions son endpoints invocables
// directamente sin pasar por el layout que protege la página, así que cada
// acción de admin la vuelve a chequear acá (defensa en profundidad, no solo
// confiar en que /admin/layout.tsx ya filtró quién llega a la pantalla).
export async function requireAdminProfile(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "admin") {
    throw new Error("No autorizado.");
  }

  return profile;
}
