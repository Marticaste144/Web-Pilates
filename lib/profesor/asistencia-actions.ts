"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AsistenciaResult = { ok: boolean; message: string };

// "Presente" con cuota vencida en esta sede lo rechaza un trigger de la
// base (paso 3) -- el error que llega acá ya es el mensaje pensado para
// mostrarse (ej. "El alumno tiene la cuota vencida..."). "Ausente" nunca
// se bloquea por eso.
//
// El profesor no tiene que "agregar" a nadie antes de poder marcarle
// presente/ausente: si la fila de asistencia todavía no existe para esta
// alumna/fecha (asistenciaId null), se crea en el mismo paso (upsert por
// clase+alumno+fecha, único en la base). Si ya existe -- incluidas las filas
// "no_registrado" de alguien agregado a mano, que no tienen alumno_id -- se
// actualiza por su id, el único identificador unívoco en ese caso.
export async function marcarAsistencia(
  claseId: string,
  fecha: string,
  alumnoId: string | null,
  asistenciaId: string | null,
  estado: "presente" | "ausente",
): Promise<AsistenciaResult> {
  const supabase = await createClient();

  const { error } = asistenciaId
    ? await supabase.from("asistencias").update({ estado }).eq("id", asistenciaId)
    : alumnoId
      ? await supabase
          .from("asistencias")
          .upsert({ clase_id: claseId, alumno_id: alumnoId, fecha, estado }, { onConflict: "clase_id,alumno_id,fecha" })
      : { error: { message: "No se pudo identificar a quién marcar." } };

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/profesor/clases/${claseId}`);
  return { ok: true, message: estado === "presente" ? "Marcado/a presente." : "Marcado/a ausente." };
}

// Alguien que no pertenece al roster de esta clase (ej. una alumna de otra
// sede/turno que viene puntualmente) -- sin alumno_id, con los datos sueltos
// que cargue el profesor, para que la asistencia quede registrada igual.
export async function agregarAlumnoNoRegistrado(
  claseId: string,
  fecha: string,
  datos: { nombre: string; apellido: string; sedeHabitual: string; profesorHabitual: string },
): Promise<AsistenciaResult> {
  const nombre = datos.nombre.trim();
  const apellido = datos.apellido.trim();

  if (!nombre || !apellido) {
    return { ok: false, message: "Completá nombre y apellido." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("asistencias").insert({
    clase_id: claseId,
    fecha,
    agregado_manualmente: true,
    no_registrado: true,
    manual_nombre: nombre,
    manual_apellido: apellido,
    manual_sede_habitual: datos.sedeHabitual.trim() || null,
    manual_profesor_habitual: datos.profesorHabitual.trim() || null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/profesor/clases/${claseId}`);
  return { ok: true, message: "Agregada a la lista." };
}
