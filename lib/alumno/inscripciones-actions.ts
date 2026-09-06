"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificarLugarLiberado } from "@/lib/email/notificaciones";
import { obtenerMiAlumnoId } from "./identidad";
import { obtenerIdentidadAlumno } from "@/lib/alumnos-identidad";

export type InscripcionResult = { ok: boolean; message: string };

// Decide activa vs. lista_espera acá (cupo/lista de espera es una decisión
// de flujo, no un invariante duro -- los invariantes duros ya los garantiza
// la base con triggers: superposición de horario, límite de 4 clases/semana
// por sede, cuota vencida bloqueando nuevas inscripciones, y aviso activo
// bloqueando la sede hoy. Si alguno de esos falla, el mensaje del trigger
// (ya en español, pensado para mostrarse tal cual) llega en error.message.
export async function inscribirseAClase(claseId: string): Promise<InscripcionResult> {
  const supabase = await createClient();
  const alumnoId = await obtenerMiAlumnoId(supabase);

  if (!alumnoId) {
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
      .insert({ alumno_id: alumnoId, clase_id: claseId, estado: "activa" });

    if (!error) {
      revalidatePath("/alumno/clases");
      revalidatePath("/alumno/clases/[sedeId]", "page");
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
    alumno_id: alumnoId,
    clase_id: claseId,
    estado: "lista_espera",
  });

  if (errorEspera) {
    return { ok: false, message: errorEspera.message };
  }

  revalidatePath("/alumno/clases");
  revalidatePath("/alumno/clases/[sedeId]", "page");
  revalidatePath("/alumno/inscripciones");
  revalidatePath("/alumno");
  return { ok: true, message: "La clase está llena: quedaste en lista de espera." };
}

const LOG = "[baja/lugar-liberado]";

export async function darseDeBaja(inscripcionId: string): Promise<InscripcionResult> {
  const supabase = await createClient();

  const { data: inscripcion } = await supabase
    .from("inscripciones")
    .select("clase_id")
    .eq("id", inscripcionId)
    .single();

  if (!inscripcion) {
    console.warn(`${LOG} no se encontró la inscripción ${inscripcionId} antes de la baja (¿RLS o id inválido?)`);
  }

  // Se toma una "foto" de quiénes están en lista de espera de esta clase
  // ANTES de dar la baja -- fn_promover_lista_espera (trigger) promueve a
  // uno de ellos automáticamente si se libera un lugar, pero por RLS un
  // alumno no puede ver las filas de otros alumnos para saber a cuál le
  // tocó, así que hace falta el cliente admin para esto (no para el update
  // de la baja en sí, que sigue yendo con la sesión del alumno).
  const admin = createAdminClient();
  const candidatos = inscripcion
    ? (
        await admin
          .from("inscripciones")
          .select("id, alumno_id")
          .eq("clase_id", inscripcion.clase_id)
          .eq("estado", "lista_espera")
          .order("posicion_espera", { ascending: true })
          .limit(10)
      ).data
    : null;

  console.log(
    `${LOG} inscripcionId=${inscripcionId} claseId=${inscripcion?.clase_id ?? "?"} candidatos en lista de espera antes de la baja: ${candidatos?.length ?? 0}`,
  );

  const { error } = await supabase
    .from("inscripciones")
    .update({ estado: "baja" })
    .eq("id", inscripcionId);

  if (error) {
    console.error(`${LOG} falló el update a 'baja'`, error);
    return { ok: false, message: error.message };
  }

  if (candidatos && candidatos.length > 0 && inscripcion) {
    // Se espera el envío (no "fire and forget"): en una función serverless
    // no hay garantía de que una promesa sin awaitear siga corriendo después
    // de que la Server Action ya devolvió la respuesta -- la plataforma
    // puede cortar la ejecución ahí mismo. El try/catch es para que, si
    // Resend falla, igual se confirme la baja (ya se aplicó arriba).
    try {
      await notificarPromocionSiCorresponde(admin, inscripcion.clase_id, candidatos);
    } catch (err) {
      console.error(`${LOG} excepción no controlada mandando el email de lugar liberado`, err);
    }
  } else {
    console.log(`${LOG} no había nadie en lista de espera para esta clase -- no hay a quién notificar`);
  }

  revalidatePath("/alumno/clases");
  revalidatePath("/alumno/clases/[sedeId]", "page");
  revalidatePath("/alumno/inscripciones");
  revalidatePath("/alumno");
  return { ok: true, message: "Te diste de baja de la clase." };
}

// De los candidatos a heredar el lugar (en orden de posicion_espera), se
// busca cuál efectivamente quedó "activa" -- el trigger puede haber saltado
// al primero si tenía superposición de horario, límite semanal, etc., así
// que no se puede asumir que fue el de la posición 1.
async function notificarPromocionSiCorresponde(
  admin: ReturnType<typeof createAdminClient>,
  claseId: string,
  candidatos: { id: string; alumno_id: string }[],
): Promise<void> {
  const { data: promovidos, error: errorPromovidos } = await admin
    .from("inscripciones")
    .select("alumno_id")
    .in(
      "id",
      candidatos.map((c) => c.id),
    )
    .eq("estado", "activa");

  if (errorPromovidos) {
    console.error(`${LOG} no se pudo consultar quién quedó 'activa' entre los candidatos`, errorPromovidos);
    return;
  }

  if (!promovidos || promovidos.length === 0) {
    // Si había candidatos pero ninguno quedó 'activa', lo más probable es
    // que el trigger fn_promover_lista_espera (migración
    // 20260812041659_notificaciones_email.sql) no esté aplicado en esta
    // base -- sin él, nadie pasa de lista_espera a activa automáticamente,
    // así que este código nunca tiene a quién avisarle (no es un bug de acá,
    // es la causa más común de este WARNING).
    console.warn(
      `${LOG} había ${candidatos.length} candidato(s) en lista de espera pero NINGUNO quedó 'activa' tras la baja -- ` +
        "revisá si la migración 20260812041659_notificaciones_email.sql (trigger fn_promover_lista_espera) está aplicada en Supabase.",
    );
    return;
  }

  if (promovidos.length > 1) {
    console.warn(
      `${LOG} ${promovidos.length} candidatos quedaron 'activa' a la vez (se esperaba 1) -- se notifica solo al primero`,
    );
  }

  const promovido = promovidos[0];

  const { data: clase, error: errorClase } = await admin
    .from("clases")
    .select("sede_id, dia_semana, hora_inicio, hora_fin")
    .eq("id", claseId)
    .single();
  if (errorClase || !clase) {
    console.error(`${LOG} no se pudo leer la clase ${claseId} para armar el email`, errorClase);
    return;
  }

  const [identidad, { data: sede, error: errorSede }] = await Promise.all([
    obtenerIdentidadAlumno(admin, promovido.alumno_id),
    admin.from("sedes").select("nombre").eq("id", clase.sede_id).single(),
  ]);
  if (!identidad) {
    console.error(`${LOG} no se pudo resolver la identidad del alumno promovido ${promovido.alumno_id}`);
    return;
  }
  if (errorSede || !sede) {
    console.error(`${LOG} no se pudo leer la sede ${clase.sede_id}`, errorSede);
    return;
  }

  // Una alumna sin cuenta (o sin email cargado) puede quedar en lista de
  // espera por una asignación manual de la admin -- no tiene a dónde
  // mandarle nada, así que se avisa por log en vez de fallar/inventar un
  // destinatario. La promoción en sí ya se aplicó igual (más arriba).
  if (!identidad.email) {
    console.log(`${LOG} alumno promovido ${promovido.alumno_id} no tiene email cargado -- no se manda notificación.`);
    return;
  }

  console.log(`${LOG} alumno promovido: ${promovido.alumno_id} (${identidad.email}) -- mandando email...`);

  await notificarLugarLiberado({
    alumnoEmail: identidad.email,
    alumnoNombre: identidad.nombre,
    sedeNombre: sede.nombre,
    diaSemana: clase.dia_semana,
    horaInicio: clase.hora_inicio,
    horaFin: clase.hora_fin,
  });
}
