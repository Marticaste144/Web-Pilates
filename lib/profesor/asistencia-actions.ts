"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AsistenciaResult = { ok: boolean; message: string };

// "Presente" con cuota vencida en esta sede lo rechaza un trigger de la
// base (paso 3) -- el error que llega acá ya es el mensaje pensado para
// mostrarse (ej. "El alumno tiene la cuota vencida..."). "Ausente" nunca
// se bloquea por eso.
export async function marcarAsistencia(
  claseId: string,
  alumnoId: string,
  fecha: string,
  estado: "presente" | "ausente",
): Promise<AsistenciaResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("asistencias")
    .upsert(
      { clase_id: claseId, alumno_id: alumnoId, fecha, estado },
      { onConflict: "clase_id,alumno_id,fecha" },
    );

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/profesor/clases/${claseId}`);
  return { ok: true, message: estado === "presente" ? "Marcado/a presente." : "Marcado/a ausente." };
}
