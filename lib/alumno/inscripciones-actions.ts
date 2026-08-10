"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type InscripcionResult = { ok: boolean; message: string };

// Decide activa vs. lista_espera acá (cupo/lista de espera es una decisión
// de flujo, no un invariante duro -- los invariantes duros ya los garantiza
// la base con triggers: superposición de horario, límite de 4 clases/semana
// por sede, cuota vencida bloqueando nuevas inscripciones, y aviso activo
// bloqueando la sede hoy. Si alguno de esos falla, el mensaje del trigger
// (ya en español, pensado para mostrarse tal cual) llega en error.message.
export async function inscribirseAClase(claseId: string): Promise<InscripcionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Iniciá sesión de nuevo." };
  }

  const { data: clase } = await supabase.from("clases").select("cupo").eq("id", claseId).single();
  if (!clase) {
    return { ok: false, message: "La clase no existe." };
  }

  const { data: cupoRow } = await supabase
    .from("v_cupo_clases")
    .select("inscriptos_activos")
    .eq("clase_id", claseId)
    .maybeSingle();

  const ocupados = cupoRow?.inscriptos_activos ?? 0;
  const hayLugar = ocupados < clase.cupo;

  if (hayLugar) {
    const { error } = await supabase
      .from("inscripciones")
      .insert({ alumno_id: user.id, clase_id: claseId, estado: "activa" });

    if (!error) {
      revalidatePath("/alumno/clases");
      revalidatePath("/alumno/inscripciones");
      revalidatePath("/alumno");
      return { ok: true, message: "Te anotaste a la clase." };
    }

    // Carrera: se llenó justo entre que consultamos el cupo y el insert.
    // El trigger de cupo lo rechaza -- reintentamos como lista de espera
    // en vez de mostrarle al alumno un error que no entendería.
    if (!error.message.includes("cupo máximo")) {
      return { ok: false, message: error.message };
    }
  }

  // posicion_espera NO se calcula acá: lo asigna fn_asignar_posicion_espera
  // (trigger, security definer) porque por RLS un alumno no puede contar
  // cuánta gente más hay en la lista de espera, solo ver sus propias filas.
  const { error: errorEspera } = await supabase.from("inscripciones").insert({
    alumno_id: user.id,
    clase_id: claseId,
    estado: "lista_espera",
  });

  if (errorEspera) {
    return { ok: false, message: errorEspera.message };
  }

  revalidatePath("/alumno/clases");
  revalidatePath("/alumno/inscripciones");
  revalidatePath("/alumno");
  return { ok: true, message: "La clase está llena: quedaste en lista de espera." };
}

export async function darseDeBaja(inscripcionId: string): Promise<InscripcionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inscripciones")
    .update({ estado: "baja" })
    .eq("id", inscripcionId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/alumno/clases");
  revalidatePath("/alumno/inscripciones");
  revalidatePath("/alumno");
  return { ok: true, message: "Te diste de baja de la clase." };
}
