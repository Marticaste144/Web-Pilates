"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { notificarAviso } from "@/lib/email/notificaciones";
import type { FormState } from "@/lib/form-state";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const LOG = "[avisos]";

// Alumnos con alguna inscripción vigente (activa o en espera) en clases de
// las sedes dadas -- o de cualquier sede si sedeIds es null (todas_las_sedes).
async function alumnoIdsPorSedes(supabase: SupabaseServerClient, sedeIds: string[] | null) {
  let query = supabase.from("clases").select("id");
  if (sedeIds) query = query.in("sede_id", sedeIds);
  const { data: clases } = await query;
  const claseIds = (clases ?? []).map((c) => c.id);
  if (claseIds.length === 0) return [];

  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("alumno_id")
    .in("clase_id", claseIds)
    .in("estado", ["activa", "lista_espera"]);

  return [...new Set((inscripciones ?? []).map((i) => i.alumno_id))];
}

// Profesores activos con alguna clase activa en las sedes dadas -- o en
// cualquier sede si sedeIds es null.
async function profesorIdsPorSedes(supabase: SupabaseServerClient, sedeIds: string[] | null) {
  let query = supabase.from("clases").select("profesor_id").eq("activa", true);
  if (sedeIds) query = query.in("sede_id", sedeIds);
  const { data: clases } = await query;
  const profesorIds = [...new Set((clases ?? []).map((c) => c.profesor_id))];
  if (profesorIds.length === 0) return [];

  const { data: profesores } = await supabase
    .from("profesores")
    .select("profile_id")
    .eq("activo", true)
    .in("profile_id", profesorIds);

  return (profesores ?? []).map((p) => p.profile_id);
}

export async function crearAviso(_prevState: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminProfile();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const mensaje = String(formData.get("mensaje") ?? "").trim();
  const fechaInicio = String(formData.get("fecha_inicio") ?? "");
  const fechaFin = String(formData.get("fecha_fin") ?? "");
  const todasLasSedes = formData.get("todas_las_sedes") === "on";
  const sedeIds = formData.getAll("sede_ids").map(String).filter(Boolean);

  if (!titulo || !mensaje || !fechaInicio || !fechaFin) {
    return { status: "error", message: "Completá todos los campos." };
  }
  if (!todasLasSedes && sedeIds.length === 0) {
    return { status: "error", message: "Elegí al menos una sede, o marcá \"todas las sedes\"." };
  }

  const supabase = await createClient();

  const { data: aviso, error } = await supabase
    .from("avisos")
    .insert({
      titulo,
      mensaje,
      todas_las_sedes: todasLasSedes,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      publicado_por: admin.id,
    })
    .select("id")
    .single();

  if (error || !aviso) {
    console.error(`${LOG} no se pudo insertar el aviso`, error);
    return { status: "error", message: error?.message ?? "No se pudo crear el aviso." };
  }

  console.log(`${LOG} aviso ${aviso.id} creado -- todasLasSedes=${todasLasSedes} sedeIds=${sedeIds.join(",") || "-"}`);

  if (!todasLasSedes && sedeIds.length > 0) {
    const { error: errorSedes } = await supabase
      .from("avisos_sedes")
      .insert(sedeIds.map((sedeId) => ({ aviso_id: aviso.id, sede_id: sedeId })));

    if (errorSedes) {
      console.error(`${LOG} aviso ${aviso.id} creado pero falló el insert de avisos_sedes`, errorSedes);
      return { status: "error", message: errorSedes.message };
    }
  }

  revalidatePath("/admin/avisos");

  // El aviso ya está publicado (y ya bloquea la actividad de la sede por los
  // triggers del paso 3) aunque el envío de emails falle -- no se revierte
  // la publicación por un problema de Resend.
  try {
    const sedeIdsFiltro = todasLasSedes ? null : sedeIds;
    const [alumnoIds, profesorIds] = await Promise.all([
      alumnoIdsPorSedes(supabase, sedeIdsFiltro),
      profesorIdsPorSedes(supabase, sedeIdsFiltro),
    ]);

    const destinatarioIds = [...new Set([...alumnoIds, ...profesorIds])];

    console.log(
      `${LOG} aviso ${aviso.id}: alumnos=${alumnoIds.length} profesores=${profesorIds.length} destinatarios únicos=${destinatarioIds.length}`,
    );

    if (destinatarioIds.length > 0) {
      const { data: perfiles } = await supabase
        .from("profiles")
        .select("email, nombre")
        .in("id", destinatarioIds);

      let sedesTexto = "Todas las sedes";
      if (!todasLasSedes) {
        const { data: sedes } = await supabase.from("sedes").select("nombre").in("id", sedeIds);
        sedesTexto = (sedes ?? []).map((s) => s.nombre).join(", ");
      }

      const { enviados, fallidos } = await notificarAviso({
        destinatarios: (perfiles ?? []).map((p) => ({ email: p.email, nombre: p.nombre })),
        titulo,
        mensaje,
        fechaInicio,
        fechaFin,
        sedesTexto,
      });

      return {
        status: "success",
        message: `Aviso publicado. Emails enviados: ${enviados}${fallidos > 0 ? ` (${fallidos} fallaron)` : ""}.`,
      };
    }
  } catch (err) {
    console.error(`${LOG} aviso ${aviso.id}: excepción no controlada mandando los emails`, err);
    return {
      status: "success",
      message: "Aviso publicado, pero no se pudieron mandar los emails (revisá la config de Resend).",
    };
  }

  console.log(`${LOG} aviso ${aviso.id}: 0 destinatarios, no se manda ningún email`);
  return { status: "success", message: "Aviso publicado (sin destinatarios para avisar por email)." };
}

// El bloqueo de una sede (fn_sede_bloqueada, paso 3) es una consulta en vivo
// contra avisos/avisos_sedes -- no hay ningún flag cacheado en otra tabla que
// haya que "apagar" aparte. Borrar la fila alcanza: en cuanto se borra, esa
// función deja de encontrarla y las próximas inscripciones/bajas/asistencia
// de la sede dejan de estar bloqueadas, sin ninguna acción manual extra.
// avisos_sedes tiene "on delete cascade" sobre aviso_id, así que también se
// limpia sola. A propósito NO manda ningún email de "se reabren las
// clases" -- ver el apartado del README sobre esta decisión.
export async function eliminarAviso(avisoId: string): Promise<{ ok: boolean; message: string }> {
  await requireAdminProfile();

  const supabase = await createClient();
  const { error } = await supabase.from("avisos").delete().eq("id", avisoId);

  if (error) {
    console.error(`${LOG} no se pudo eliminar el aviso ${avisoId}`, error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/avisos");
  return { ok: true, message: "Aviso eliminado -- la sede ya no está bloqueada para ese rango de fechas." };
}
