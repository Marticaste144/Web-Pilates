import { createClient } from "@/lib/supabase/server";
import { aplicarDescuentoDosActividades, calcularCuotaProporcional, calcularClasesDelMesYRestantes } from "@/lib/cuota-calculo";
import type { EstadoInscripcion } from "@/types/database";

export type ItemCuotaAlumno = {
  sedeId: string;
  actividadId: string;
  frecuencia: number;
  precio: number;
  prorateado: boolean;
  clasesDelMes: number | null;
  clasesRestantes: number | null;
};

export type ResultadoCuotaAlumno = {
  items: ItemCuotaAlumno[];
  periodoMes: string;
  /** Sedes con alguna clase sin actividad clasificada -- esa sede no se puede cobrar todavía. */
  sedesSinClasificar: Set<string>;
  /** Sedes con alguna actividad sin arancel vigente para su frecuencia real. */
  sedesSinArancel: Set<string>;
};

// Precio de CADA actividad del alumno, en TODAS sus sedes, con el 20% off ya
// aplicado a la más cara cuando combina exactamente dos actividades
// distintas (en cualquier combinación de sedes -- ver
// aplicarDescuentoDosActividades en lib/cuota-calculo.ts) y con el
// prorrateo del mes calendario ya aplicado donde corresponda (primera
// cuota de ESA sede, incorporación con el mes ya empezado). Cada sede se
// sigue facturando por separado (pago propio, con su propio
// vencimiento/estado histórico) -- lo único que deja de estar acotado a
// "misma sede" es la comparación para decidir cuál actividad lleva el
// descuento. Base compartida de calcularMontoCuotaSede (pago puntual de una
// sede) y de lib/alumno/cuota-data.ts (todas las sedes juntas, para
// /alumno/cuota).
export async function calcularItemsCuotaAlumno(
  supabase: Awaited<ReturnType<typeof createClient>>,
  alumnoId: string,
  estadosInscripcion: EstadoInscripcion[],
): Promise<ResultadoCuotaAlumno> {
  const hoy = new Date();
  const hoyIso = hoy.toISOString().slice(0, 10);
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;
  const mesActualIso = `${anio}-${String(mes).padStart(2, "0")}`;
  const periodoMes = `${mesActualIso}-01`;

  const [{ data: inscripciones }, { data: pagosAprobados }] = await Promise.all([
    supabase
      .from("inscripciones")
      .select("clase_id, fecha_inscripcion")
      .eq("alumno_id", alumnoId)
      .in("estado", estadosInscripcion),
    supabase.from("pagos").select("sede_id").eq("alumno_id", alumnoId).eq("estado", "aprobado"),
  ]);

  const claseIds = [...new Set((inscripciones ?? []).map((i) => i.clase_id))];
  if (claseIds.length === 0) {
    return { items: [], periodoMes, sedesSinClasificar: new Set(), sedesSinArancel: new Set() };
  }

  const { data: clases } = await supabase.from("clases").select("id, sede_id, actividad_id, dia_semana").in("id", claseIds);
  if (!clases || clases.length === 0) {
    return { items: [], periodoMes, sedesSinClasificar: new Set(), sedesSinArancel: new Set() };
  }

  const sedesSinClasificar = new Set(clases.filter((c) => !c.actividad_id).map((c) => c.sede_id));
  const clasesClasificadas = clases.filter((c) => c.actividad_id !== null);

  const sedesConPagoAprobado = new Set((pagosAprobados ?? []).map((p) => p.sede_id).filter((id): id is string => id !== null));

  // Agrupa por (sede, actividad): cada combinación se cobra en el pago de
  // esa sede puntual, a la frecuencia real del alumno ahí.
  const keyPorClaseId = new Map(clasesClasificadas.map((c) => [c.id, `${c.sede_id}:${c.actividad_id}`]));
  const diasPorGrupo = new Map<string, number[]>();
  const sedeActividadPorGrupo = new Map<string, { sedeId: string; actividadId: string }>();
  for (const c of clasesClasificadas) {
    const key = keyPorClaseId.get(c.id)!;
    (diasPorGrupo.get(key) ?? diasPorGrupo.set(key, []).get(key)!).push(c.dia_semana);
    sedeActividadPorGrupo.set(key, { sedeId: c.sede_id, actividadId: c.actividad_id as string });
  }

  // "Desde su incorporación" -- la más antigua de sus inscripciones en ESE
  // grupo (sede+actividad), no el día de hoy: si se incorporó en un mes
  // anterior, este mes ya le corresponde completo.
  const incorporacionPorGrupo = new Map<string, string>();
  for (const i of inscripciones ?? []) {
    const key = keyPorClaseId.get(i.clase_id);
    if (!key) continue;
    const fecha = i.fecha_inscripcion.slice(0, 10);
    const actual = incorporacionPorGrupo.get(key);
    if (!actual || fecha < actual) incorporacionPorGrupo.set(key, fecha);
  }

  const actividadIds = [...new Set(clasesClasificadas.map((c) => c.actividad_id as string))];
  const { data: arancelRows } =
    actividadIds.length > 0
      ? await supabase
          .from("aranceles")
          .select("actividad_id, clases_por_semana, valor_mensual, vigente_desde")
          .in("actividad_id", actividadIds)
          .lte("vigente_desde", hoyIso)
      : { data: [] as { actividad_id: string | null; clases_por_semana: number; valor_mensual: number; vigente_desde: string }[] };

  function precioVigente(actividadId: string, frecuencia: number): number | null {
    const vigente = (arancelRows ?? [])
      .filter((a) => a.actividad_id === actividadId && a.clases_por_semana === frecuencia)
      .sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))[0];
    return vigente?.valor_mensual ?? null;
  }

  const sedesSinArancel = new Set<string>();
  const items: ItemCuotaAlumno[] = [];
  for (const [key, dias] of diasPorGrupo) {
    const { sedeId, actividadId } = sedeActividadPorGrupo.get(key)!;
    const frecuencia = dias.length;
    const precioMensual = precioVigente(actividadId, frecuencia);
    if (precioMensual === null) {
      sedesSinArancel.add(sedeId);
      continue;
    }

    const fechaIncorporacion = incorporacionPorGrupo.get(key) ?? hoyIso;
    const seIncorporoEsteMes = fechaIncorporacion.slice(0, 7) === mesActualIso;
    const diaIncorporacion = seIncorporoEsteMes ? Number(fechaIncorporacion.slice(8, 10)) : 1;
    const debeProratear = !sedesConPagoAprobado.has(sedeId) && seIncorporoEsteMes && diaIncorporacion > 1;

    if (!debeProratear) {
      items.push({ sedeId, actividadId, frecuencia, precio: precioMensual, prorateado: false, clasesDelMes: null, clasesRestantes: null });
      continue;
    }

    const { totalMes, restantes } = calcularClasesDelMesYRestantes(anio, mes, dias, diaIncorporacion);
    items.push({
      sedeId,
      actividadId,
      frecuencia,
      precio: calcularCuotaProporcional(precioMensual, totalMes, restantes),
      prorateado: true,
      clasesDelMes: totalMes,
      clasesRestantes: restantes,
    });
  }

  return { items: aplicarDescuentoDosActividades(items), periodoMes, sedesSinClasificar, sedesSinArancel };
}

export type CalculoCuotaSede =
  | { ok: true; monto: number; actividadesIds: string[]; frecuenciaSemanal: number; periodoMes: string }
  | { ok: false; message: string };

// Monto a cobrar por UNA sede puntual (usado al subir un comprobante o al
// registrar un pago en efectivo -- ver comentario de calcularItemsCuotaAlumno
// de arriba sobre por qué el descuento se decide mirando todas las sedes
// del alumno aunque el pago se registre por separado en cada una). Solo
// considera inscripciones "activa" -- no se cobra por un lugar en lista de
// espera. Nunca confía en un monto mandado desde el cliente.
export async function calcularMontoCuotaSede(
  supabase: Awaited<ReturnType<typeof createClient>>,
  alumnoId: string,
  sedeId: string,
): Promise<CalculoCuotaSede> {
  const resultado = await calcularItemsCuotaAlumno(supabase, alumnoId, ["activa"]);

  if (resultado.sedesSinClasificar.has(sedeId)) {
    return {
      ok: false,
      message: "Todavía falta clasificar la actividad de alguna clase de este alumno en esta sede -- contactá a la administración.",
    };
  }

  const items = resultado.items.filter((i) => i.sedeId === sedeId);
  const huboIntentoEnEstaSede = items.length > 0 || resultado.sedesSinArancel.has(sedeId);
  if (!huboIntentoEnEstaSede) {
    return { ok: false, message: "Este alumno no tiene clases activas en esta sede." };
  }
  if (resultado.sedesSinArancel.has(sedeId)) {
    return { ok: false, message: "No hay un arancel definido para esta frecuencia todavía." };
  }

  return {
    ok: true,
    monto: items.reduce((acc, i) => acc + i.precio, 0),
    actividadesIds: [...new Set(items.map((i) => i.actividadId))],
    frecuenciaSemanal: items.reduce((acc, i) => acc + i.frecuencia, 0),
    periodoMes: resultado.periodoMes,
  };
}
