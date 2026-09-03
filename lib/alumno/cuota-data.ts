import { createClient } from "@/lib/supabase/server";
import { calcularMontoCombinado, calcularCuotaProporcional, calcularClasesDelMesYRestantes } from "@/lib/cuota-calculo";
import type { EstadoVisualCuota } from "@/types/database";

export type CuotaSedeItem = {
  sedeId: string;
  sedeNombre: string;
  estado: EstadoVisualCuota | "sin_pagos";
  vencimiento: string | null;
  frecuenciaSemanal: number | null;
  monto: number | null;
  /**
   * Precio a transferir HOY para las actividades reales del alumno en esta
   * sede (no el monto histórico de su último pago, que puede quedar viejo
   * si el arancel subió). Ya aplica:
   *   - el 20% de descuento en la actividad más cara si combina DOS
   *     actividades distintas en esta misma sede (regla confirmada) --
   *     combinaciones entre sedes distintas no se descuentan entre sí
   *     todavía (cada sede se paga por separado).
   *   - el prorrateo por mes calendario si todavía no tiene ningún pago
   *     aprobado en esta sede y se incorporó con el mes ya empezado (ver
   *     esProrateado/clasesDelMes/clasesRestantes).
   * Null si falta clasificar la actividad de alguna clase, o si no hay
   * arancel definido para esa frecuencia.
   */
  precioActual: number | null;
  /** true si precioActual es null por falta de actividad clasificada en alguna clase (no por falta de arancel). */
  faltaClasificarActividad: boolean;
  /** true si precioActual ya viene prorrateado (primera cuota, mes ya empezado). */
  esProrateado: boolean;
  clasesDelMes: number | null;
  clasesRestantes: number | null;
  /** Transferencia con comprobante ya subido, esperando que la admin la revise. */
  transferenciaPendiente: { monto: number; createdAt: string } | null;
  /**
   * El intento de pago MÁS RECIENTE de esta sede fue rechazado y todavía no
   * hay uno más nuevo (pendiente o aprobado) que lo reemplace -- se usa para
   * avisarle claramente al alumno que puede volver a subir un comprobante.
   * Null si el más reciente no es un rechazo, o si no hay ningún pago.
   */
  ultimoRechazo: { monto: number; createdAt: string } | null;
};

// Una fila por sede donde el alumno tiene alguna inscripción (activa o en
// espera) -- no solo las que ya tienen un pago aprobado, para que quien
// nunca pagó también vea "sin_pagos" en vez de simplemente no aparecer.
export async function listarEstadoCuotaAlumno(): Promise<CuotaSedeItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("clase_id, fecha_inscripcion")
    .in("estado", ["activa", "lista_espera"]);

  if (!inscripciones || inscripciones.length === 0) return [];

  const claseIds = [...new Set(inscripciones.map((i) => i.clase_id))];
  const { data: clases } = await supabase.from("clases").select("id, sede_id, actividad_id, dia_semana").in("id", claseIds);
  const clasePorId = new Map((clases ?? []).map((c) => [c.id, c]));
  const sedeIds = [...new Set((clases ?? []).map((c) => c.sede_id))];
  if (sedeIds.length === 0) return [];

  // Frecuencia semanal REAL por (sede, actividad), días de la semana por
  // (sede, actividad) para el prorrateo, y fecha de incorporación más
  // antigua por sede -- todo derivado de las inscripciones reales, no de un
  // dato guardado aparte.
  const frecuenciaPorSedeActividad = new Map<string, number>(); // key: `${sedeId}:${actividadId ?? "null"}`
  const diasPorSedeActividad = new Map<string, number[]>();
  const actividadesPorSede = new Map<string, Set<string | null>>();
  const incorporacionPorSede = new Map<string, string>();
  for (const i of inscripciones) {
    const clase = clasePorId.get(i.clase_id);
    if (!clase) continue;
    const key = `${clase.sede_id}:${clase.actividad_id ?? "null"}`;
    frecuenciaPorSedeActividad.set(key, (frecuenciaPorSedeActividad.get(key) ?? 0) + 1);
    (diasPorSedeActividad.get(key) ?? diasPorSedeActividad.set(key, []).get(key)!).push(clase.dia_semana);
    const set = actividadesPorSede.get(clase.sede_id) ?? new Set<string | null>();
    set.add(clase.actividad_id);
    actividadesPorSede.set(clase.sede_id, set);

    const fechaIncorp = i.fecha_inscripcion.slice(0, 10);
    const actual = incorporacionPorSede.get(clase.sede_id);
    if (!actual || fechaIncorp < actual) incorporacionPorSede.set(clase.sede_id, fechaIncorp);
  }

  const actividadIds = [...new Set((clases ?? []).map((c) => c.actividad_id).filter((id): id is string => id !== null))];

  const hoy = new Date();
  const hoyIso = hoy.toISOString().slice(0, 10);
  const [{ data: sedes }, { data: cuotas }, { data: aranceles }, { data: pagosRecientes }] = await Promise.all([
    supabase.from("sedes").select("id, nombre").in("id", sedeIds),
    supabase.from("v_estado_cuota_alumno_sede").select("*"),
    actividadIds.length > 0
      ? supabase
          .from("aranceles")
          .select("actividad_id, clases_por_semana, valor_mensual, vigente_desde")
          .in("actividad_id", actividadIds)
          .lte("vigente_desde", hoyIso)
      : Promise.resolve({ data: [] as { actividad_id: string | null; clases_por_semana: number; valor_mensual: number; vigente_desde: string }[] }),
    // Todos los pagos recientes del alumno (cualquier estado) -- para
    // resolver, por sede, cuál fue el ÚLTIMO intento (pendiente/rechazado/
    // aprobado) y así distinguir "rechazado, todavía sin resolver" de
    // "rechazado hace tiempo pero después se aprobó otro".
    supabase
      .from("pagos")
      .select("sede_id, monto, estado, medio, created_at")
      .eq("alumno_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const cuotaPorSede = new Map((cuotas ?? []).map((c) => [c.sede_id, c]));

  const pendientePorSede = new Map<string, { monto: number; createdAt: string }>();
  const ultimoRechazoPorSede = new Map<string, { monto: number; createdAt: string }>();
  const ultimoResueltoPorSede = new Set<string>(); // sedes donde ya se vio un pago más reciente que un eventual rechazo
  for (const p of pagosRecientes ?? []) {
    if (!p.sede_id) continue; // pago nuevo por actividad -- no se resuelve acá (ver Tarea 5/6, cuota combinada)
    if (p.medio === "transferencia" && p.estado === "pendiente" && !pendientePorSede.has(p.sede_id)) {
      pendientePorSede.set(p.sede_id, { monto: p.monto, createdAt: p.created_at });
    }
    // Como la lista viene ordenada por created_at desc, el primer pago que
    // se ve por sede es el más reciente -- si ese es "rechazado", se avisa;
    // si es cualquier otro estado, esa sede queda "resuelta" y no se busca
    // más para el aviso de rechazo (uno más viejo no importa).
    if (!ultimoResueltoPorSede.has(p.sede_id) && !ultimoRechazoPorSede.has(p.sede_id)) {
      if (p.estado === "rechazado") {
        ultimoRechazoPorSede.set(p.sede_id, { monto: p.monto, createdAt: p.created_at });
      } else {
        ultimoResueltoPorSede.add(p.sede_id);
      }
    }
  }

  function precioVigentePorActividad(actividadId: string, frecuencia: number): number | null {
    const vigente = (aranceles ?? [])
      .filter((a) => a.actividad_id === actividadId && a.clases_por_semana === frecuencia)
      .sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))[0];
    return vigente?.valor_mensual ?? null;
  }

  // Precio de la sede = combina el precio de cada actividad distinta que el
  // alumno hace ahí (a su propia frecuencia semanal) -- 1 sola actividad:
  // ese precio tal cual; 2 actividades distintas: la más cara con 20% off
  // (regla confirmada); si falta clasificar la actividad de alguna clase, o
  // falta el arancel de alguna frecuencia, no se puede calcular (null). Si
  // todavía no tiene ningún pago aprobado en esta sede y el mes ya empezó,
  // se prorratea sobre las clases que le quedan (mes calendario, nunca "30
  // días desde el pago" -- ver lib/cuota-calculo.ts).
  function calcularPrecioDeSede(
    sedeId: string,
    yaPagoAlgunaVez: boolean,
  ): { precio: number | null; faltaClasificar: boolean; prorateado: boolean; clasesDelMes: number | null; clasesRestantes: number | null } {
    const actividades = [...(actividadesPorSede.get(sedeId) ?? [])];
    if (actividades.some((a) => a === null)) {
      return { precio: null, faltaClasificar: true, prorateado: false, clasesDelMes: null, clasesRestantes: null };
    }

    const anio = hoy.getFullYear();
    const mes = hoy.getMonth() + 1;
    const mesActualIso = `${anio}-${String(mes).padStart(2, "0")}`;

    // "Desde su incorporación" -- el día que se anotó a esta sede (la más
    // antigua de sus inscripciones ahí), NO el día de hoy (podría estar
    // consultando la página varios días después de anotarse). Si se
    // incorporó en un mes anterior a éste, este mes ya le corresponde
    // completo -- el prorrateo es solo para el mes en que se incorpora.
    const fechaIncorporacion = incorporacionPorSede.get(sedeId) ?? hoyIso;
    const seIncorporoEsteMes = fechaIncorporacion.slice(0, 7) === mesActualIso;
    const diaIncorporacion = seIncorporoEsteMes ? Number(fechaIncorporacion.slice(8, 10)) : 1;
    const debeProratear = !yaPagoAlgunaVez && seIncorporoEsteMes && diaIncorporacion > 1;

    const precios: number[] = [];
    let clasesDelMesTotal = 0;
    let clasesRestantesTotal = 0;
    for (const actividadId of actividades as string[]) {
      const key = `${sedeId}:${actividadId}`;
      const frecuencia = frecuenciaPorSedeActividad.get(key) ?? 0;
      const precioMensual = precioVigentePorActividad(actividadId, frecuencia);
      if (precioMensual === null) {
        return { precio: null, faltaClasificar: false, prorateado: false, clasesDelMes: null, clasesRestantes: null };
      }

      if (!debeProratear) {
        precios.push(precioMensual);
        continue;
      }

      const dias = diasPorSedeActividad.get(key) ?? [];
      const { totalMes, restantes } = calcularClasesDelMesYRestantes(anio, mes, dias, diaIncorporacion);
      clasesDelMesTotal += totalMes;
      clasesRestantesTotal += restantes;
      precios.push(calcularCuotaProporcional(precioMensual, totalMes, restantes));
    }

    return {
      precio: calcularMontoCombinado(precios),
      faltaClasificar: false,
      prorateado: debeProratear,
      clasesDelMes: debeProratear ? clasesDelMesTotal : null,
      clasesRestantes: debeProratear ? clasesRestantesTotal : null,
    };
  }

  return (sedes ?? []).map((s): CuotaSedeItem => {
    const cuota = cuotaPorSede.get(s.id);
    const {
      precio: precioActual,
      faltaClasificar: faltaClasificarActividad,
      prorateado: esProrateado,
      clasesDelMes,
      clasesRestantes,
    } = calcularPrecioDeSede(s.id, Boolean(cuota));
    const transferenciaPendiente = pendientePorSede.get(s.id) ?? null;
    const ultimoRechazo = ultimoRechazoPorSede.get(s.id) ?? null;

    if (!cuota) {
      return {
        sedeId: s.id,
        sedeNombre: s.nombre,
        estado: "sin_pagos",
        vencimiento: null,
        frecuenciaSemanal: null,
        monto: null,
        precioActual,
        faltaClasificarActividad,
        esProrateado,
        clasesDelMes,
        clasesRestantes,
        transferenciaPendiente,
        ultimoRechazo,
      };
    }
    return {
      sedeId: s.id,
      sedeNombre: s.nombre,
      estado: cuota.estado_visual,
      vencimiento: cuota.vencimiento,
      frecuenciaSemanal: cuota.frecuencia_semanal,
      monto: cuota.monto,
      precioActual,
      faltaClasificarActividad,
      esProrateado,
      clasesDelMes,
      clasesRestantes,
      transferenciaPendiente,
      ultimoRechazo,
    };
  });
}
