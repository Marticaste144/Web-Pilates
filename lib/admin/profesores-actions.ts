"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import { notificarInvitacionProfesor } from "@/lib/email/notificaciones";
import type { FormState } from "@/lib/form-state";

const DIACRITICOS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

function normalizarNombre(nombre: string): string {
  return nombre.trim().toLowerCase().normalize("NFD").replace(DIACRITICOS, "");
}

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

  if (error || !data?.properties?.hashed_token || !data.user) {
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

  // Vincula clases que ya estaban cargadas para esta persona real SIN cuenta
  // todavía (clases.profesor_pendiente_nombre, ver BLOQUE DATOS REALES) a la
  // cuenta recién creada -- por nombre normalizado (sin tildes/mayúsculas),
  // igual criterio que fotoEstaticaDeProfesor. Solo REASIGNA profesor_id en
  // clases que ya existían: nunca crea ni duplica un profesor, y no toca
  // clases inactivas/alumnos/asistencias/planificaciones de esas clases --
  // siguen siendo las mismas filas, con el mismo id, solo cambian de
  // "pendiente" a vinculadas.
  const nuevoProfesorId = data.user.id;
  const supabase = await createClient();
  const { data: clasesPendientes } = await supabase
    .from("clases")
    .select("id, profesor_pendiente_nombre")
    .not("profesor_pendiente_nombre", "is", null);

  const nombreNormalizado = normalizarNombre(nombre);
  const idsAVincular = (clasesPendientes ?? [])
    .filter((c) => normalizarNombre(c.profesor_pendiente_nombre!) === nombreNormalizado)
    .map((c) => c.id);

  let clasesVinculadas = 0;
  if (idsAVincular.length > 0) {
    const { error: errorVinculo } = await supabase
      .from("clases")
      .update({ profesor_id: nuevoProfesorId, profesor_pendiente_nombre: null })
      .in("id", idsAVincular);

    if (errorVinculo) {
      console.error("[profesores-actions] no se pudieron vincular las clases pendientes de este nombre", errorVinculo);
    } else {
      clasesVinculadas = idsAVincular.length;
    }
  }

  revalidatePath("/admin/profesores");
  revalidatePath("/admin/clases");
  revalidatePath("/");
  return {
    status: "success",
    message:
      clasesVinculadas > 0
        ? `Invitación enviada a ${email} -- se vincularon ${clasesVinculadas} clase${clasesVinculadas === 1 ? "" : "s"} que ya estaban cargadas a nombre de "${nombre}".`
        : `Invitación enviada a ${email}.`,
  };
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

const TIPOS_FOTO_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_FOTO_MAXIMO = 5 * 1024 * 1024; // 5 MiB, de sobra para una foto tipo carnet

function extensionDeFoto(nombre: string, tipo: string): string {
  const porNombre = nombre.split(".").pop();
  if (porNombre && porNombre.length <= 5) return porNombre.toLowerCase();
  return tipo === "image/png" ? "png" : "jpg";
}

// Foto tipo carnet para la sección pública de profesores (Tarea 1) -- bucket
// "profesores" (público, creado a mano -- ver migración
// 20260901090000_profesores_foto_publica.sql). Mismo path fijo
// "<profesor_id>/foto.<ext>" que "rutinas": una subida nueva pisa siempre a
// la anterior, sin basura acumulada.
export async function subirFotoProfesor(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminProfile();

  const profileId = String(formData.get("profile_id") ?? "");
  const archivo = formData.get("foto");

  if (!profileId || !(archivo instanceof File) || archivo.size === 0) {
    return { status: "error", message: "Elegí una imagen para subir." };
  }
  if (!TIPOS_FOTO_PERMITIDOS.includes(archivo.type)) {
    return { status: "error", message: "Solo se aceptan imágenes JPG, PNG o WEBP." };
  }
  if (archivo.size > TAMANO_FOTO_MAXIMO) {
    return { status: "error", message: "La imagen pesa más de 5 MB." };
  }

  const supabase = await createClient();
  const path = `${profileId}/foto.${extensionDeFoto(archivo.name, archivo.type)}`;

  const { error: errorUpload } = await supabase.storage
    .from("profesores")
    .upload(path, archivo, { contentType: archivo.type, upsert: true });

  if (errorUpload) {
    return { status: "error", message: `No se pudo subir la foto: ${errorUpload.message}` };
  }

  const { error } = await supabase.from("profesores").update({ foto_url: path }).eq("profile_id", profileId);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin/profesores");
  revalidatePath(`/admin/profesores/${profileId}`);
  revalidatePath("/");
  return { status: "success", message: "Foto actualizada." };
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
