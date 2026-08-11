"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";

// El profesor puede editar datos personales del alumno, pero no su rol ni
// email -- eso lo bloquea trg_restringir_columnas_profile (paso 3) sin
// importar qué mande este formulario.
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
  const { error } = await supabase
    .from("profiles")
    .update({ nombre, apellido, telefono: telefono || null })
    .eq("id", alumnoId);

  if (error) {
    return { status: "error", message: error.message };
  }

  if (claseId) revalidatePath(`/profesor/clases/${claseId}`);
  return { status: "success", message: "Datos actualizados." };
}
