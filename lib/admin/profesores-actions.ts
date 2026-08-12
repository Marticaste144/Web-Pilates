"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import { notificarInvitacionProfesor } from "@/lib/email/notificaciones";
import type { FormState } from "@/lib/form-state";

// Invita a un profesor por email. Antes esto usaba
// auth.admin.inviteUserByEmail() (que manda el mail default de Supabase,
// apuntando a su endpoint /auth/v1/verify?token=...&type=invite): ese
// endpoint consume el token de un solo uso con un simple GET, ANTES de
// llegar a nuestra app -- así que un escáner de seguridad de Gmail/Outlook
// que pre-visita el link del mail para chequearlo se lo gasta antes de que
// la persona real haga click. Esto pasa haya PKCE o no -- el flujo no
// cambia nada acá, el problema es un GET consumiendo el token solo.
//
// Fix real: generateLink() arma el token pero NO manda ningún mail (ni pasa
// por /verify) -- el mail lo mandamos nosotros con Resend, con un link que
// apunta directo a /auth/confirm-invite?token_hash=...&type=invite. Esa
// página NO confirma sola al cargar: pide un click explícito antes de
// llamar a verifyOtp() (ver ese archivo). Un bot no hace click en un botón.
//
// El trigger fn_handle_new_user (paso 2) sigue creando la fila en
// profiles/profesores solo, con role='profesor' desde los metadatos --
// generateLink({type:'invite'}) crea el usuario igual que
// inviteUserByEmail lo hacía.
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
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { role: "profesor", nombre, apellido, telefono: telefono || null },
      redirectTo: `${siteUrl}/auth/confirm-invite`,
    },
  });

  if (error || !data?.properties?.hashed_token) {
    return { status: "error", message: error?.message ?? "No se pudo generar la invitación." };
  }

  const confirmUrl = `${siteUrl}/auth/confirm-invite?token_hash=${data.properties.hashed_token}&type=invite`;

  try {
    await notificarInvitacionProfesor({ email, nombre, confirmUrl });
  } catch (err) {
    console.error("No se pudo mandar el email de invitación", err);
    return {
      status: "error",
      message:
        "Se creó el usuario pero no se pudo mandar el email de invitación -- revisá la configuración de Resend.",
    };
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

// Cambiar el email de acceso es distinto a los demás datos: hay que tocar
// auth.users (API de admin, service_role) Y profiles.email (una copia
// cacheada desde el paso 2). El update de profiles.email se hace con la
// sesión del admin (no con el cliente admin/service_role): el trigger
// fn_restringir_columnas_profile exige fn_current_role() = 'admin' para
// permitir tocar esa columna, y esa función lee auth.uid() -- una conexión
// service_role no tiene sesión, así que auth.uid() da null y el trigger
// rechazaría el update igual si se usara ese cliente acá.
export async function actualizarEmailProfesor(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdminProfile();

  const profileId = String(formData.get("profile_id") ?? "");
  const email = String(formData.get("email") ?? "").trim();

  if (!profileId || !email) {
    return { status: "error", message: "Ingresá un email válido." };
  }

  const admin = createAdminClient();
  const { error: errorAuth } = await admin.auth.admin.updateUserById(profileId, {
    email,
    email_confirm: true,
  });

  if (errorAuth) {
    return { status: "error", message: errorAuth.message };
  }

  const supabase = await createClient();
  const { error: errorPerfil } = await supabase.from("profiles").update({ email }).eq("id", profileId);

  if (errorPerfil) {
    return { status: "error", message: errorPerfil.message };
  }

  revalidatePath("/admin/profesores");
  revalidatePath(`/admin/profesores/${profileId}`);
  return { status: "success", message: "Email actualizado -- la próxima vez que inicie sesión, va a usar el nuevo." };
}

// "Eliminar" acá SÍ es un DELETE real (a diferencia del resto de la app,
// donde "eliminar" casi siempre es desactivar): tiene sentido para un
// profesor cargado por error o que nunca debió tener cuenta. Si ya dictó
// alguna clase, se bloquea -- no se puede simplemente permitir, porque
// clases.profesor_id tiene "on delete restrict" (no se quiere perder el
// historial de qué profesor dio qué clase). Se chequea antes para dar un
// mensaje claro en vez del error crudo de Postgres.
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

export async function eliminarProfesor(profileId: string): Promise<{ ok: boolean; message: string }> {
  await requireAdminProfile();

  const supabase = await createClient();
  const { count } = await supabase
    .from("clases")
    .select("id", { count: "exact", head: true })
    .eq("profesor_id", profileId);

  if (count && count > 0) {
    return {
      ok: false,
      message: `Tiene ${count} clase${count === 1 ? "" : "s"} asignada${count === 1 ? "" : "s"} -- reasigná esas clases a otro profesor antes de eliminarlo.`,
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(profileId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/profesores");
  return { ok: true, message: "Profesor eliminado." };
}
