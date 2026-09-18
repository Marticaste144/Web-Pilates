"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import { notificarRecuperacionContrasena } from "@/lib/email/notificaciones";
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
  const aceptaTerminos = formData.get("acepta_terminos") === "on";

  if (!email || !password || !nombre || !apellido) {
    return { status: "error", message: "Completá todos los campos obligatorios." };
  }

  // El checkbox ya es "required" en el form (bloquea el submit en el
  // navegador), pero eso es solo del lado del cliente -- se vuelve a
  // chequear acá porque una Server Action se puede invocar directo, sin
  // pasar por el formulario.
  if (!aceptaTerminos) {
    return { status: "error", message: "Tenés que aceptar los Términos y Condiciones y la Política de Privacidad para crear la cuenta." };
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

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { status: "error", message: "Ingresá tu email." };
  }

  let siteUrl: string;
  try {
    siteUrl = getSiteUrl();
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Falta configurar la URL del sitio." };
  }

  // Antes esto usaba supabase.auth.resetPasswordForEmail(), que manda el
  // mail default de Supabase apuntando a su propio /auth/v1/verify. Ese
  // endpoint entrega los tokens en el HASH de la URL (#access_token=...),
  // que ningún servidor puede leer -- por eso /auth/confirm (que solo sabía
  // leer ?code=) nunca recibía nada usable y el link terminaba siempre en
  // /login sin ningún error visible. Mismo bug de fondo que ya se había
  // encontrado y resuelto para las invitaciones de profesores/alumnas (ver
  // /auth/confirm-invite): la solución es la misma -- generar el token
  // nosotros con generateLink(), armar el link a mano apuntando directo a
  // /auth/confirm-invite?token_hash=...&type=recovery (que sí funciona
  // enteramente del lado del cliente con verifyOtp) y mandarlo con nuestro
  // propio mail de Resend en vez del mail default de Supabase.
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  // Se responde igual haya o no una cuenta con ese email (generateLink
  // falla si el email no existe), para no revelar qué emails están
  // registrados.
  if (!error && data?.properties?.hashed_token) {
    const confirmUrl = `${siteUrl}/auth/confirm-invite?token_hash=${data.properties.hashed_token}&type=recovery&flow=reset`;
    const nombre = typeof data.user?.user_metadata?.nombre === "string" ? data.user.user_metadata.nombre : "";

    try {
      await notificarRecuperacionContrasena({ email, nombre, confirmUrl });
    } catch (err) {
      console.error("No se pudo mandar el email de recuperación de contraseña", err);
    }
  } else if (error) {
    console.log(`[auth:forgot-password] generateLink no encontró cuenta para ${email} (o falló): ${error.message}`);
  }

  return {
    status: "check_email",
    message: "Si el email existe, te enviamos un link para restablecer la contraseña.",
  };
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 6) {
    return { status: "error", message: "La contraseña debe tener al menos 6 caracteres." };
  }
  if (password !== confirmPassword) {
    return { status: "error", message: "Las contraseñas no coinciden." };
  }

  const supabase = await createClient();

  // Server Action invocable directo, sin pasar por reset-password/page.tsx
  // (que ya chequea sesión antes de mostrar el form) -- se vuelve a chequear
  // acá por si alguien la llama sin haber pasado por ahí.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "El link expiró o no es válido. Pedí uno nuevo." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { status: "error", message: "El link expiró o no es válido. Pedí uno nuevo." };
  }

  redirect("/");
}
