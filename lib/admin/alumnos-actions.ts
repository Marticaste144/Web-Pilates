"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import { notificarInvitacionAlumna, notificarReenvioInvitacionAlumna } from "@/lib/email/notificaciones";
import type { FormState } from "@/lib/form-state";

// Alta manual de una alumna real que asiste presencialmente pero puede no
// querer (o no necesitar todavía) usar la web -- "alumna de MUV" ya NO
// implica tener cuenta de Auth (ver migración 20260906090000_identidad_
// alumnas.sql). Nunca se crea un usuario de Auth ni se inventa un email acá:
// solo se completa si la admin lo carga a mano, y queda sin acceso hasta que
// alguien use "Dar acceso a MUV" más adelante.
export async function crearAlumnaManual(_prevState: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminProfile();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!nombre || !apellido) {
    return { status: "error", message: "Completá nombre y apellido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alumnos")
    .insert({
      nombre,
      apellido,
      telefono: telefono || null,
      email: email || null,
      creado_por: admin.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", message: error?.message ?? "No se pudo crear la alumna." };
  }

  revalidatePath("/admin/alumnos");
  redirect(`/admin/alumnos/${data.id}`);
}

// Editar los datos de una alumna SIN cuenta (nombre/apellido/teléfono/email
// se guardan directo en "alumnos" -- si ya tiene cuenta, esos datos los
// sigue editando actualizarDatosAlumnoConCuenta contra "profiles", el
// camino de siempre, sin cambios).
export async function actualizarAlumnaManual(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminProfile();

  const alumnoId = String(formData.get("alumno_id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!alumnoId || !nombre || !apellido) {
    return { status: "error", message: "Completá nombre y apellido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("alumnos")
    .update({ nombre, apellido, telefono: telefono || null, email: email || null })
    .eq("id", alumnoId)
    .is("profile_id", null);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin/alumnos");
  revalidatePath(`/admin/alumnos/${alumnoId}`);
  return { status: "success", message: "Datos actualizados." };
}

export async function cambiarActivoAlumna(alumnoId: string, activo: boolean) {
  await requireAdminProfile();

  const supabase = await createClient();
  const { error } = await supabase.from("alumnos").update({ activo }).eq("id", alumnoId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/alumnos");
  revalidatePath(`/admin/alumnos/${alumnoId}`);
}

export type AsignacionResult = { ok: boolean; message: string };

// Asignación manual de una alumna (con o sin cuenta) a una clase real -- se
// comporta como una inscripción cualquiera: ocupa cupo igual, y los mismos
// triggers de la base (límite de 4 clases/semana por sede, superposición de
// horario, cupo máximo) siguen aplicando -- fn_validar_cuota_para_
// inscripcion y fn_validar_aviso_inscripcion sí exceptúan a la admin (ya
// existía así para poder regularizar casos manuales), pero esos tres no: ni
// la admin puede pasarse del cupo o duplicar un horario por error.
export async function asignarAlumnaAClase(alumnoId: string, claseId: string): Promise<AsignacionResult> {
  await requireAdminProfile();
  const supabase = await createClient();

  const { data: clase } = await supabase.from("clases").select("cupo").eq("id", claseId).single();
  if (!clase) {
    return { ok: false, message: "La clase no existe." };
  }

  const { data: cupoRow } = await supabase
    .from("v_cupo_clases")
    .select("inscriptos_activos")
    .eq("clase_id", claseId)
    .maybeSingle();

  const hayLugar = (cupoRow?.inscriptos_activos ?? 0) < clase.cupo;
  const estado = hayLugar ? "activa" : "lista_espera";

  const { error } = await supabase.from("inscripciones").insert({ alumno_id: alumnoId, clase_id: claseId, estado });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/alumnos");
  revalidatePath(`/admin/alumnos/${alumnoId}`);
  revalidatePath("/admin/clases");
  return {
    ok: true,
    message: hayLugar ? "Se asignó a la clase." : "La clase está llena -- quedó en lista de espera.",
  };
}

// Quitar/cambiar una inscripción manual: es la misma baja de siempre (estado
// = 'baja', nunca se borra la fila) -- no rompe historial ni asistencias ya
// tomadas, y libera el cupo/lista de espera exactamente igual que si la
// alumna se hubiera dado de baja ella misma.
export async function quitarAlumnaDeClase(alumnoId: string, inscripcionId: string): Promise<AsignacionResult> {
  await requireAdminProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("inscripciones").update({ estado: "baja" }).eq("id", inscripcionId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/alumnos");
  revalidatePath(`/admin/alumnos/${alumnoId}`);
  revalidatePath("/admin/clases");
  return { ok: true, message: "Se quitó de la clase." };
}

// "Dar acceso a MUV": la admin confirma/ingresa el email real de una alumna
// que ya existe sin cuenta y le manda una invitación -- NUNCA crea una
// alumna nueva. generateLink({type:'invite'}) crea el usuario de Auth y
// dispara fn_handle_new_user, que (por venir con alumno_id en los
// metadatos) VINCULA profile_id a esta misma fila en vez de crear otra
// (ver migración 20260906090000_identidad_alumnas.sql). Mismo patrón ya
// probado para profesores (lib/admin/profesores-actions.ts, invitarProfesor).
export async function darAccesoAlumna(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminProfile();

  const alumnoId = String(formData.get("alumno_id") ?? "");
  const email = String(formData.get("email") ?? "").trim();

  if (!alumnoId || !email) {
    return { status: "error", message: "Ingresá el email de la alumna." };
  }

  const supabase = await createClient();
  const { data: alumno } = await supabase
    .from("alumnos")
    .select("nombre, apellido, telefono, profile_id")
    .eq("id", alumnoId)
    .single();

  if (!alumno) {
    return { status: "error", message: "No se encontró la alumna." };
  }
  if (alumno.profile_id) {
    return { status: "error", message: "Esta alumna ya tiene acceso." };
  }
  if (!alumno.nombre || !alumno.apellido) {
    return { status: "error", message: "Faltan nombre/apellido de la alumna." };
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
      data: { role: "alumno", alumno_id: alumnoId, nombre: alumno.nombre, apellido: alumno.apellido, telefono: alumno.telefono },
      redirectTo: `${siteUrl}/auth/confirm-invite`,
    },
  });

  if (error || !data?.properties?.hashed_token) {
    return { status: "error", message: error?.message ?? "No se pudo generar la invitación." };
  }

  const confirmUrl = `${siteUrl}/auth/confirm-invite?token_hash=${data.properties.hashed_token}&type=invite`;

  try {
    await notificarInvitacionAlumna({ email, nombre: alumno.nombre, confirmUrl });
  } catch (err) {
    console.error("No se pudo mandar el email de invitación a la alumna", err);
    return {
      status: "error",
      message: "Se generó el acceso pero no se pudo mandar el email -- revisá la configuración de Resend.",
    };
  }

  revalidatePath("/admin/alumnos");
  revalidatePath(`/admin/alumnos/${alumnoId}`);
  return { status: "success", message: `Invitación enviada a ${email}.` };
}

// Reenvío para una alumna que ya fue invitada pero no confirmó -- mismo
// mecanismo que reenviarInvitacion de profesores: type:"recovery" (Supabase
// no deja generar otro type:"invite" para un email ya registrado), mismo
// usuario, misma alumna, nunca duplica nada.
export async function reenviarInvitacionAlumna(alumnoId: string): Promise<AsignacionResult> {
  await requireAdminProfile();

  const supabase = await createClient();
  const { data: alumno } = await supabase.from("alumnos").select("profile_id").eq("id", alumnoId).single();

  if (!alumno?.profile_id) {
    return { ok: false, message: "Esta alumna todavía no tiene una invitación enviada." };
  }

  const admin = createAdminClient();
  const [{ data: usuario }, { data: perfil }] = await Promise.all([
    admin.auth.admin.getUserById(alumno.profile_id),
    supabase.from("profiles").select("email, nombre").eq("id", alumno.profile_id).single(),
  ]);

  if (usuario?.user?.email_confirmed_at) {
    return { ok: false, message: "Ya tiene acceso activo -- no hace falta reenviar la invitación." };
  }
  if (!perfil) {
    return { ok: false, message: "No se encontró el perfil de la alumna." };
  }

  let siteUrl: string;
  try {
    siteUrl = getSiteUrl();
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Falta configurar la URL del sitio." };
  }

  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: perfil.email });

  if (error || !data?.properties?.hashed_token) {
    return { ok: false, message: error?.message ?? "No se pudo generar el link de invitación." };
  }

  const confirmUrl = `${siteUrl}/auth/confirm-invite?token_hash=${data.properties.hashed_token}&type=recovery`;

  try {
    await notificarReenvioInvitacionAlumna({ email: perfil.email, nombre: perfil.nombre, confirmUrl });
  } catch (err) {
    console.error("No se pudo mandar el email de reenvío de invitación a la alumna", err);
    return { ok: false, message: "No se pudo mandar el email -- revisá la configuración de Resend." };
  }

  return { ok: true, message: `Invitación reenviada a ${perfil.email}.` };
}
