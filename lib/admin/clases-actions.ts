"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";
import type { ModalidadClase } from "@/types/database";

function parseClaseForm(formData: FormData) {
  const sedeId = String(formData.get("sede_id") ?? "");
  const profesorId = String(formData.get("profesor_id") ?? "").trim() || null;
  const profesorPendienteNombre = String(formData.get("profesor_pendiente_nombre") ?? "").trim() || null;
  const diaSemana = Number(formData.get("dia_semana"));
  const horaInicio = String(formData.get("hora_inicio") ?? "");
  const horaFin = String(formData.get("hora_fin") ?? "");
  const cupo = Number(formData.get("cupo") || 8);
  const actividadId = String(formData.get("actividad_id") ?? "").trim() || null;
  const modalidadRaw = String(formData.get("modalidad") ?? "").trim();
  const modalidad = (modalidadRaw === "personalizada" || modalidadRaw === "grupal" ? modalidadRaw : null) as
    | ModalidadClase
    | null;

  if (!sedeId || !horaInicio || !horaFin || !diaSemana) {
    return null;
  }
  // El profesor es una cosa u otra, nunca las dos ni ninguna -- mismo
  // constraint que la base (chk_clases_profesor_identificado).
  if ((!profesorId && !profesorPendienteNombre) || (profesorId && profesorPendienteNombre)) {
    return null;
  }

  return { sedeId, profesorId, profesorPendienteNombre, diaSemana, horaInicio, horaFin, cupo, actividadId, modalidad };
}

export async function crearClase(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminProfile();

  const parsed = parseClaseForm(formData);
  if (!parsed) {
    return { status: "error", message: "Completá todos los campos (profesor real O nombre pendiente, nunca los dos)." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clases").insert({
    sede_id: parsed.sedeId,
    profesor_id: parsed.profesorId,
    profesor_pendiente_nombre: parsed.profesorPendienteNombre,
    dia_semana: parsed.diaSemana,
    hora_inicio: parsed.horaInicio,
    hora_fin: parsed.horaFin,
    cupo: parsed.cupo,
    actividad_id: parsed.actividadId,
    modalidad: parsed.modalidad,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin/clases");
  return { status: "success", message: "Clase creada." };
}

export async function actualizarClase(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminProfile();

  const id = String(formData.get("id") ?? "");
  const parsed = parseClaseForm(formData);
  if (!id || !parsed) {
    return { status: "error", message: "Completá todos los campos (profesor real O nombre pendiente, nunca los dos)." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clases")
    .update({
      sede_id: parsed.sedeId,
      profesor_id: parsed.profesorId,
      profesor_pendiente_nombre: parsed.profesorPendienteNombre,
      dia_semana: parsed.diaSemana,
      hora_inicio: parsed.horaInicio,
      hora_fin: parsed.horaFin,
      cupo: parsed.cupo,
      actividad_id: parsed.actividadId,
      modalidad: parsed.modalidad,
    })
    .eq("id", id);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin/clases");
  revalidatePath(`/admin/clases/${id}`);
  return { status: "success", message: "Clase actualizada." };
}

// "Eliminar" una clase = desactivarla (activa=false), no un DELETE real: si
// borráramos la fila se perdería el historial de inscripciones/asistencias
// de esa clase (cascada). Desactivada deja de listarse para que el alumno
// se anote.
export async function cambiarActivaClase(id: string, activa: boolean) {
  await requireAdminProfile();

  const supabase = await createClient();
  const { error } = await supabase.from("clases").update({ activa }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/clases");
  revalidatePath(`/admin/clases/${id}`);
}
