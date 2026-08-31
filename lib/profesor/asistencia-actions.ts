"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AsistenciaResult = { ok: boolean; message: string };

// "Presente" con cuota vencida en esta sede lo rechaza un trigger de la
// base (paso 3) -- el error que llega acá ya es el mensaje pensado para
// mostrarse (ej. "El alumno tiene la cuota vencida..."). "Ausente" nunca
// se bloquea por eso.
//
// Se marca por asistenciaId (no por alumno_id+clase+fecha) porque una fila
// puede ser de alguien "no_registrado" (alumno_id null) -- el id de la fila
// es lo único que identifica esos casos de forma unívoca.
export async function marcarAsistencia(
  claseId: string,
  asistenciaId: string,
  estado: "presente" | "ausente",
): Promise<AsistenciaResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("asistencias").update({ estado }).eq("id", asistenciaId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/profesor/clases/${claseId}`);
  return { ok: true, message: estado === "presente" ? "Marcado/a presente." : "Marcado/a ausente." };
}

// Caso (a) del alta manual: alumna de la propia clase (inscripta ahí) que se
// olvidó de confirmar 1hs antes. Se crea la fila de asistencia (sin estado
// todavía) para que pase a la lista y el profesor pueda marcarle
// presente/ausente igual que a las que sí confirmaron.
export async function agregarAlumnoRoster(claseId: string, alumnoId: string, fecha: string): Promise<AsistenciaResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("asistencias").insert({
    clase_id: claseId,
    alumno_id: alumnoId,
    fecha,
    agregado_manualmente: true,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/profesor/clases/${claseId}`);
  return { ok: true, message: "Alumna agregada a la lista." };
}

// Caso (b) del alta manual: alguien de recuperación que NO pertenece a esta
// clase/sede (no debería pasar, pero el profesor necesita poder registrarlo
// si sucede). Sin alumno_id -- queda identificado como "agregado
// manualmente / no registrado" con los datos sueltos que cargue el profesor.
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
  return { ok: true, message: "Alumna de recuperación agregada a la lista." };
}
