import { createClient } from "@/lib/supabase/server";

export type ElegibilidadRecuperacion =
  | { ok: true; ausenciaId: string; disponiblesRestantes: number }
  | { ok: false; motivo: string };

// Recuperaciones de Pilates (BLOQUE MUV — equipo/recuperaciones/profesores):
// SOLO existen para Pilates, se cargan a mano por el profesor (coordinación
// previa por WhatsApp, no hay autogestión de alumnas -- ver
// 20260901140000_elimina_recuperaciones_generales.sql, que dio de baja ESE
// otro mecanismo). Reutiliza asistencias.es_recuperacion (ya existía, sin
// uso) en vez de una tabla nueva -- ver migración 20260904090000.
//
// Reglas confirmadas:
//   - Máximo mensual = frecuencia semanal de Pilates contratada (1x -> 1,
//     2x -> 2, etc.) -- se lee de las inscripciones activas reales, nunca de
//     un nombre de plan hardcodeado.
//   - Nunca más recuperaciones que AUSENCIAS REALES de Pilates sin recuperar
//     todavía en ese mismo mes calendario (no se acumulan de un mes a otro:
//     una ausencia de julio no se puede recuperar en agosto).
//   - Cada recuperación queda enlazada 1 a 1 a la ausencia puntual que
//     repone (recupera_ausencia_id).
//
// CONSUMO (corregido -- confirmado por Marti): reservar una recuperación
// (agregarla a la clase, estado todavía null) NO la da por consumida
// todavía -- una recuperación se consume DEFINITIVAMENTE recién cuando el
// profesor la marca Presente. Si en cambio queda Ausente, la ausencia
// original vuelve a estar disponible para un intento nuevo dentro del mismo
// mes calendario -- la fila vieja no se borra (queda como historial de que
// hubo un intento), simplemente deja de "ocupar" la ausencia.
// "Activa" = estado IS DISTINCT FROM 'ausente' (reservada -- estado null,
// o presente). Tanto "ausencia sin recuperar todavía" como "recuperaciones
// que ya cuentan contra el máximo mensual" se calculan con este MISMO
// criterio -- ver uq_asistencias_recupera_ausencia_activa en la migración:
// mientras está reservada, cuenta para ambos límites (evita sobre-reservar
// más citas de las que la frecuencia permite); si se resuelve Ausente, dejó
// de estar activa y libera los dos límites a la vez; si se resuelve
// Presente, queda consumida para siempre (no se puede volver a usar esa
// ausencia, ni libera el cupo mensual).
export async function obtenerElegibilidadRecuperacion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  alumnoId: string,
  fechaDestino: string,
): Promise<ElegibilidadRecuperacion> {
  const { data: actividad } = await supabase.from("actividades").select("id").eq("nombre", "Pilates").single();
  if (!actividad) {
    return { ok: false, motivo: "No está configurada la actividad Pilates." };
  }
  const pilatesId = actividad.id;

  const anio = Number(fechaDestino.slice(0, 4));
  const mes = Number(fechaDestino.slice(5, 7));
  const anioMes = fechaDestino.slice(0, 7); // "YYYY-MM"
  const desde = `${anioMes}-01`;
  // Día 0 del mes siguiente = último día real de "mes" (28/29/30/31) --
  // "YYYY-MM-31" como límite fijo rompe en los meses que no llegan a 31
  // (Postgres lo rechaza por ser una fecha inválida, no la trata como "se
  // pasa de largo sin problema").
  const ultimoDiaDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const hasta = `${anioMes}-${String(ultimoDiaDelMes).padStart(2, "0")}`;

  const [{ data: inscripciones }, { data: ausenciasCrudo }, { data: recuperacionesCrudo }, { data: ligadas }] = await Promise.all([
    supabase.from("inscripciones").select("clase_id").eq("alumno_id", alumnoId).eq("estado", "activa"),
    supabase
      .from("asistencias")
      .select("id, clase_id, fecha")
      .eq("alumno_id", alumnoId)
      .eq("estado", "ausente")
      .eq("es_recuperacion", false)
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: true }),
    supabase
      .from("asistencias")
      .select("id, clase_id, estado")
      .eq("alumno_id", alumnoId)
      .eq("es_recuperacion", true)
      .gte("fecha", desde)
      .lte("fecha", hasta),
    // Todas las recuperaciones ya enlazadas a una ausencia (de cualquier
    // alumna/clase/mes) -- se filtra a "activas" en JS, no en la consulta,
    // para no depender de "estado <> 'ausente'" en SQL: con estado NULL
    // (reservada, todavía sin marcar) esa comparación da NULL (ni true ni
    // false) y excluiría por error a las reservas pendientes.
    supabase.from("asistencias").select("recupera_ausencia_id, estado").not("recupera_ausencia_id", "is", null),
  ]);

  const claseIdsRelevantes = [
    ...new Set([
      ...(inscripciones ?? []).map((i) => i.clase_id),
      ...(ausenciasCrudo ?? []).map((a) => a.clase_id),
      ...(recuperacionesCrudo ?? []).map((r) => r.clase_id),
    ]),
  ];
  const { data: clases } = await supabase.from("clases").select("id, actividad_id").in("id", claseIdsRelevantes);
  const clasesPilatesIds = new Set((clases ?? []).filter((c) => c.actividad_id === pilatesId).map((c) => c.id));

  const frecuenciaSemanal = new Set(
    (inscripciones ?? []).filter((i) => clasesPilatesIds.has(i.clase_id)).map((i) => i.clase_id),
  ).size;
  if (frecuenciaSemanal === 0) {
    return { ok: false, motivo: "Esta alumna no tiene Pilates activo -- las recuperaciones son solo para alumnas de Pilates." };
  }

  const idsYaLigadosActivamente = new Set(
    (ligadas ?? []).filter((r) => r.estado !== "ausente").map((r) => r.recupera_ausencia_id),
  );
  const ausenciasDisponibles = (ausenciasCrudo ?? []).filter(
    (a) => clasesPilatesIds.has(a.clase_id) && !idsYaLigadosActivamente.has(a.id),
  );
  const yaUsadasEsteMes = (recuperacionesCrudo ?? []).filter(
    (r) => clasesPilatesIds.has(r.clase_id) && r.estado !== "ausente",
  ).length;

  const restantesPorFrecuencia = frecuenciaSemanal - yaUsadasEsteMes;
  if (restantesPorFrecuencia <= 0) {
    return {
      ok: false,
      motivo: `Ya tiene las ${frecuenciaSemanal} recuperación(es) que le corresponden este mes según su frecuencia de Pilates (${frecuenciaSemanal}x por semana), entre reservadas y realizadas.`,
    };
  }

  if (ausenciasDisponibles.length === 0) {
    return { ok: false, motivo: "No tiene ninguna ausencia de Pilates sin recuperar en este mes." };
  }

  return {
    ok: true,
    ausenciaId: ausenciasDisponibles[0].id,
    disponiblesRestantes: Math.min(restantesPorFrecuencia, ausenciasDisponibles.length),
  };
}
