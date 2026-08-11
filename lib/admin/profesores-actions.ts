"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import type { FormState } from "@/lib/form-state";

// Invita a un profesor por email (Supabase Auth Admin API -- crea el
// usuario y le manda un link para que fije su propia contraseña). El
// trigger fn_handle_new_user (paso 2) crea sola la fila en
// profiles/profesores apenas se crea el usuario, con role='profesor' desde
// los metadatos.
//
// El redirectTo apunta a /auth/callback (Client Component), NO a
// /auth/confirm: inviteUserByEmail no soporta PKCE (el navegador que manda
// la invitación no es el mismo que la acepta, así que no hay code_verifier
// compartido), el link trae los tokens en el hash de la URL y eso solo lo
// puede leer el browser.
export async function invitarProfesor(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdminProfile();

  const email = String(formData.get("email") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();

  if (!email || !nombre || !apellido) {
    return { status: "error", message: "Completá nombre, apellido y email." };
  }

  let siteUrl: string;
  try {
    siteUrl = getSiteUrl();
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Falta configurar la URL del sitio." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { role: "profesor", nombre, apellido, telefono: telefono || null },
    redirectTo: `${siteUrl}/auth/callback`,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin/profesores");
  return { status: "success", message: `Invitación enviada a ${email}.` };
}

export async function actualizarProfesor(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdminProfile();

  const profileId = String(formData.get("profile_id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();

  if (!profileId || !nombre || !apellido) {
    return { status: "error", message: "Completá nombre y apellido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ nombre, apellido, telefono: telefono || null })
    .eq("id", profileId);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin/profesores");
  revalidatePath(`/admin/profesores/${profileId}`);
  return { status: "success", message: "Datos actualizados." };
}

// "Eliminar" un profesor en la práctica es desactivarlo, no un DELETE real:
// sus clases/asistencias históricas quedan (clases.profesor_id tiene
// on delete restrict, así que un DELETE ni siquiera funcionaría si ya dictó
// alguna clase). Desactivado no aparece como opción al asignar clases nuevas.
export async function cambiarActivoProfesor(profileId: string, activo: boolean) {
  await requireAdminProfile();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profesores")
    .update({ activo })
    .eq("profile_id", profileId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/profesores");
  revalidatePath(`/admin/profesores/${profileId}`);
}
