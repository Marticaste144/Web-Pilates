"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";

// El profesor puede editar datos personales de la alumna, pero no su rol ni
// email -- eso lo bloquea trg_restringir_columnas_profile (paso 3) sin
// importar qué mande este formulario.
//
// alumnoId es siempre el id de "alumnos" (nunca auth.uid()/profile_id -- ver
// migración 20260906090000_identidad_alumnas.sql). Si la alumna ya tiene
// cuenta, el dato real sigue viviendo en "profiles" (RLS: "profesor
// actualiza datos de sus alumnos", resuelve el puente alumnos.id -> profiles
// vía profile_id); si no tiene cuenta, se edita directo en "alumnos" (RLS:
// "profesor actualiza datos de alumnas sin cuenta").
export async function actualizarDatosAlumno(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const alumnoId = String(formData.get("alumno_id") ?? "");
  const claseId = String(formData.get("clase_id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();

  if (!alumnoId || !nombre || !apellido) {
    return { status: "error", message: "Completá nombre y apellido." };
  }

  const supabase = await createClient();
  const { data: alumno } = await supabase.from("alumnos").select("profile_id").eq("id", alumnoId).single();

  const { error } = alumno?.profile_id
    ? await supabase.from("profiles").update({ nombre, apellido, telefono: telefono || null }).eq("id", alumno.profile_id)
    : await supabase.from("alumnos").update({ nombre, apellido, telefono: telefono || null }).eq("id", alumnoId);

  if (error) {
    return { status: "error", message: error.message };
  }

  if (claseId) revalidatePath(`/profesor/clases/${claseId}`);
  return { status: "success", message: "Datos actualizados." };
}
