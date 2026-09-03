import { createClient } from "@/lib/supabase/server";
import { calcularMontoCombinado, calcularCuotaProporcional, calcularClasesDelMesYRestantes } from "@/lib/cuota-calculo";

export type CalculoCuotaSede =
  | { ok: true; monto: number; actividadesIds: string[]; frecuenciaSemanal: number; periodoMes: string }
  | { ok: false; message: string };

// Cálculo server-side del monto real a cobrar a un alumno en una sede --
// compartido entre subirComprobantePago (alumno) y registrarPagoEfectivo
// (admin) para que ambos caminos cobren EXACTAMENTE lo mismo: precio por
// actividad a la frecuencia real, combinado con el 20% off en la más cara
// si son dos actividades distintas (regla confirmada), y prorrateado por
// mes calendario si es la primera cuota del alumno en esta sede y se
// incorporó con el mes ya empezado. Nunca confía en un monto mandado desde
// el cliente -- ver lib/cuota-calculo.ts para las fórmulas puras.
export async function calcularMontoCuotaSede(
  supabase: Awaited<ReturnType<typeof createClient>>,
  alumnoId: string,
  sedeId: string,
): Promise<CalculoCuotaSede> {
  const [{ data: inscripciones }, { data: pagoAprobadoPrevio }] = await Promise.all([
    supabase.from("inscripciones").select("clase_id, fecha_inscripcion").eq("alumno_id", alumnoId).eq("estado", "activa"),
    supabase.from("pagos").select("id").eq("alumno_id", alumnoId).eq("sede_id", sedeId).eq("estado", "aprobado").limit(1).maybeSingle(),
  ]);

  const claseIds = [...new Set((inscripciones ?? []).map((i) => i.clase_id))];
  if (claseIds.length === 0) {
    return { ok: false, message: "Este alumno no tiene clases activas en ninguna sede." };
  }

  const { data: clases } = await supabase
    .from("clases")
    .select("id, sede_id, actividad_id, dia_semana")
    .in("id", claseIds)
    .eq("sede_id", sedeId);

  if (!clases || clases.length === 0) {
    return { ok: false, message: "Este alumno no tiene clases activas en esta sede." };
  }
  if (clases.some((c) => !c.actividad_id)) {
    return { ok: false, message: "Todavía falta clasificar la actividad de alguna clase de este alumno en esta sede." };
  }

  const actividadIds = [...new Set(clases.map((c) => c.actividad_id as string))];
  const frecuenciaPorActividad = new Map<string, number>();
  const diasPorActividad = new Map<string, number[]>();
  for (const c of clases) {
    const id = c.actividad_id as string;
    frecuenciaPorActividad.set(id, (frecuenciaPorActividad.get(id) ?? 0) + 1);
    (diasPorActividad.get(id) ?? diasPorActividad.set(id, []).get(id)!).push(c.dia_semana);
  }

  const hoy = new Date();
  const hoyIso = hoy.toISOString().slice(0, 10);
  const { data: arancelRows } = await supabase
    .from("aranceles")
    .select("actividad_id, clases_por_semana, valor_mensual, vigente_desde")
    .in("actividad_id", actividadIds)
    .lte("vigente_desde", hoyIso);

  function precioVigente(actividadId: string, frecuencia: number): number | null {
    const vigente = (arancelRows ?? [])
      .filter((a) => a.actividad_id === actividadId && a.clases_por_semana === frecuencia)
      .sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))[0];
    return vigente?.valor_mensual ?? null;
  }

  const anio = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;
  const mesActualIso = `${anio}-${String(mes).padStart(2, "0")}`;
  const fechaIncorporacion =
    (inscripciones ?? [])
      .filter((i) => claseIds.includes(i.clase_id))
      .map((i) => i.fecha_inscripcion.slice(0, 10))
      .sort()[0] ?? hoyIso;
  const seIncorporoEsteMes = fechaIncorporacion.slice(0, 7) === mesActualIso;
  const diaIncorporacion = seIncorporoEsteMes ? Number(fechaIncorporacion.slice(8, 10)) : 1;
  const debeProratear = !pagoAprobadoPrevio && seIncorporoEsteMes && diaIncorporacion > 1;

  const precios: number[] = [];
  for (const actividadId of actividadIds) {
    const frecuencia = frecuenciaPorActividad.get(actividadId) ?? 0;
    const precioMensual = precioVigente(actividadId, frecuencia);
    if (precioMensual === null) {
      return { ok: false, message: "No hay un arancel definido para esta frecuencia todavía." };
    }
    if (!debeProratear) {
      precios.push(precioMensual);
      continue;
    }
    const dias = diasPorActividad.get(actividadId) ?? [];
    const { totalMes, restantes } = calcularClasesDelMesYRestantes(anio, mes, dias, diaIncorporacion);
    precios.push(calcularCuotaProporcional(precioMensual, totalMes, restantes));
  }

  return {
    ok: true,
    monto: calcularMontoCombinado(precios),
    actividadesIds: actividadIds,
    frecuenciaSemanal: clases.length,
    periodoMes: `${mesActualIso}-01`,
  };
}
