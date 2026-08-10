"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthActionState } from "./auth-state";

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { status: "error", message: "Completá email y contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: "Email o contraseña incorrectos." };
  }

  redirect("/");
}

// Autoregistro de alumno (sección 2.3 del doc). El rol queda fijo en
// 'alumno' -- profesor/admin los crea la admin, no es autoregistro público.
export async function signUpAlumno(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();

  if (!email || !password || !nombre || !apellido) {
    return { status: "error", message: "Completá todos los campos obligatorios." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: "alumno", nombre, apellido, telefono: telefono || null },
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  if (data.session) {
    redirect("/");
  }

  // Sin sesión inmediata = el proyecto tiene confirmación de mail activada.
  return {
    status: "check_email",
    message: "Te enviamos un email para confirmar tu cuenta.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
