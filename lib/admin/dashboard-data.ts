import { createClient } from "@/lib/supabase/server";

export type DashboardMetricas = {
  alumnosActivosTotal: number;
  alumnosActivosPorSede: { sedeId: string; sedeNombre: string; cantidad: number }[];
  ocupacionPromedio: number; // 0-100
  clasesActivasTotal: number;
  profesoresActivosTotal: number;
  listaEsperaTotal: number;
  cuotasVencidas: number;
  facturacionMes: { total: number; mercadopago: number; efectivo: number; transferencia: number };
  comprobantesPendientes: number;
};

// Todo se calcula acá con fetch + reduce en JS (mismo criterio que el resto
// de lib/admin/*: nunca RPC ni agregación en SQL) -- el volumen de filas de
// un centro chico no lo justifica, y mantiene un solo patrón de acceso a
// datos en toda la app.
export async function obtenerMetricas(): Promise<DashboardMetricas> {
  const supabase = await createClient();

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [
    { data: sedes },
    { data: clases },
    { data: inscripcionesActivas },
    { count: listaEsperaTotal },
    { data: profesoresActivos },
    { data: cuotas },
    { data: pagosMes },
    { data: cupos },
    { count: comprobantesPendientes },
  ] = await Promise.all([
    supabase.from("sedes").select("id, nombre"),
    supabase.from("clases").select("id, sede_id, cupo, activa"),
    supabase.from("inscripciones").select("alumno_id, clase_id").eq("estado", "activa"),
    supabase.from("inscripciones").select("id", { count: "exact", head: true }).eq("estado", "lista_espera"),
    supabase.from("profesores").select("profile_id").eq("activo", true),
    supabase.from("v_estado_cuota_alumno_sede").select("alumno_id, sede_id, estado_visual"),
    supabase
      .from("pagos")
      .select("monto, medio")
      .eq("estado", "aprobado")
      .gte("aprobado_en", inicioMes.toISOString()),
    supabase.from("v_cupo_clases").select("clase_id, inscriptos_activos"),
    supabase.from("pagos").select("id", { count: "exact", head: true }).eq("estado", "pendiente").not("comprobante_url", "is", null),
  ]);

  const clasePorId = new Map((clases ?? []).map((c) => [c.id, c]));
  const ocupadosPorClase = new Map((cupos ?? []).map((c) => [c.clase_id, c.inscriptos_activos]));

  // Alumnos "activos" = tienen al menos una inscripción activa. Un mismo
  // alumno en 2 clases de la misma sede cuenta una sola vez para esa sede
  // (y una sola vez en el total, aunque esté en varias sedes) -- por eso
  // Set, no un simple count de filas.
  const alumnosTotal = new Set<string>();
  const alumnosPorSede = new Map<string, Set<string>>();
  for (const i of inscripcionesActivas ?? []) {
    const clase = clasePorId.get(i.clase_id);
    if (!clase) continue;
    alumnosTotal.add(i.alumno_id);
    const set = alumnosPorSede.get(clase.sede_id) ?? new Set<string>();
    set.add(i.alumno_id);
    alumnosPorSede.set(clase.sede_id, set);
  }

  const alumnosActivosPorSede = (sedes ?? []).map((s) => ({
    sedeId: s.id,
    sedeNombre: s.nombre,
    cantidad: alumnosPorSede.get(s.id)?.size ?? 0,
  }));

  // Ocupación promedio: promedio simple (no ponderado por cupo) de
  // inscriptos_activos/cupo entre las clases activas -- cada clase pesa
  // igual, sea de 6 o de 8 lugares.
  const clasesActivas = (clases ?? []).filter((c) => c.activa);
  const ocupaciones = clasesActivas.map((c) => (c.cupo > 0 ? (ocupadosPorClase.get(c.id) ?? 0) / c.cupo : 0));
  const ocupacionPromedio =
    ocupaciones.length > 0 ? Math.round((ocupaciones.reduce((a, b) => a + b, 0) / ocupaciones.length) * 100) : 0;

  const cuotasVencidas = (cuotas ?? []).filter((c) => c.estado_visual === "vencida").length;

  let mercadopago = 0;
  let efectivo = 0;
  let transferencia = 0;
  for (const p of pagosMes ?? []) {
    if (p.medio === "mercadopago") mercadopago += p.monto;
    else if (p.medio === "transferencia") transferencia += p.monto;
    else efectivo += p.monto;
  }

  return {
    alumnosActivosTotal: alumnosTotal.size,
    alumnosActivosPorSede,
    ocupacionPromedio,
    clasesActivasTotal: clasesActivas.length,
    profesoresActivosTotal: (profesoresActivos ?? []).length,
    listaEsperaTotal: listaEsperaTotal ?? 0,
    cuotasVencidas,
    facturacionMes: { total: mercadopago + efectivo + transferencia, mercadopago, efectivo, transferencia },
    comprobantesPendientes: comprobantesPendientes ?? 0,
  };
}
