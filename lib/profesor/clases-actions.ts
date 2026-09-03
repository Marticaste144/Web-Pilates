"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";
import type { ModalidadClase } from "@/types/database";

// El profesor puede crear/editar/desactivar SOLO sus propios horarios --
// nunca hace falta un requireRole ni un chequeo de dueño acá: profesor_id
// se fuerza a auth.uid() en el insert, y en el update la RLS ("profesor
// actualiza sus propias clases") ya rechaza cualquier fila que no sea suya.
function parseHorarioForm(formData: FormData) {
  const sedeId = String(formData.get("sede_id") ?? "");
  const diaSemana = Number(formData.get("dia_semana"));
  const horaInicio = String(formData.get("hora_inicio") ?? "");
  const horaFin = String(formData.get("hora_fin") ?? "");
  const cupo = Number(formData.get("cupo") || 8);
  const actividadId = String(formData.get("actividad_id") ?? "").trim() || null;
  const modalidadRaw = String(formData.get("modalidad") ?? "").trim();
  const modalidad = (modalidadRaw === "personalizada" || modalidadRaw === "grupal" ? modalidadRaw : null) as
    | ModalidadClase
    | null;

  if (!sedeId || !horaInicio || !horaFin || !diaSemana) return null;
  return { sedeId, diaSemana, horaInicio, horaFin, cupo, actividadId, modalidad };
}

export async function crearMiClase(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Iniciá sesión de nuevo." };

  const parsed = parseHorarioForm(formData);
  if (!parsed) return { status: "error", message: "Completá todos los campos." };

  const { error } = await supabase.from("clases").insert({
    sede_id: parsed.sedeId,
    profesor_id: user.id,
    dia_semana: parsed.diaSemana,
    hora_inicio: parsed.horaInicio,
    hora_fin: parsed.horaFin,
    cupo: parsed.cupo,
    actividad_id: parsed.actividadId,
    modalidad: parsed.modalidad,
  });

  if (error) return { status: "error", message: error.message };

  revalidatePath("/profesor/clases");
  return { status: "success", message: "Horario creado." };
}

export async function actualizarMiClase(_prevState: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const parsed = parseHorarioForm(formData);
  if (!id || !parsed) return { status: "error", message: "Completá todos los campos." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clases")
    .update({
      sede_id: parsed.sedeId,
      dia_semana: parsed.diaSemana,
      hora_inicio: parsed.horaInicio,
      hora_fin: parsed.horaFin,
      cupo: parsed.cupo,
      actividad_id: parsed.actividadId,
      modalidad: parsed.modalidad,
    })
    .eq("id", id);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/profesor/clases");
  revalidatePath(`/profesor/clases/${id}`);
  return { status: "success", message: "Horario actualizado." };
}

export async function cambiarActivaMiClase(id: string, activa: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("clases").update({ activa }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/profesor/clases");
  revalidatePath(`/profesor/clases/${id}`);
}
