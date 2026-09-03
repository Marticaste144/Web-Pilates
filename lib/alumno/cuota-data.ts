import { createClient } from "@/lib/supabase/server";
import { calcularItemsCuotaAlumno } from "@/lib/pagos-calculo-server";
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
   *   - el 20% de descuento en la actividad más cara si el alumno combina
   *     DOS actividades distintas (regla confirmada por Laura) -- la
   *     comparación es por actividad, no por sede: si hace una en esta
   *     sede y la otra en otra sede distinta, igual se comparan entre sí
   *     para decidir cuál lleva el descuento, aunque cada sede se siga
   *     pagando por separado (ver lib/pagos-calculo-server.ts).
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
    .select("clase_id")
    .in("estado", ["activa", "lista_espera"]);

  if (!inscripciones || inscripciones.length === 0) return [];

  const claseIds = [...new Set(inscripciones.map((i) => i.clase_id))];
  const { data: clases } = await supabase.from("clases").select("id, sede_id").in("id", claseIds);
  const sedeIds = [...new Set((clases ?? []).map((c) => c.sede_id))];
  if (sedeIds.length === 0) return [];

  // El precio (con el descuento de dos actividades ya resuelto entre TODAS
  // las sedes del alumno, no solo esta) sale de la misma función que usan
  // subirComprobantePago/registrarPagoEfectivo -- para que la cifra que ve
  // acá el alumno sea siempre la misma que se le termina cobrando. Incluye
  // lista de espera (no solo "activa") a propósito: si el alumno todavía no
  // tiene un lugar confirmado en ninguna sede, igual queda una fila
  // "sin_pagos" en vez de desaparecer de la pantalla.
  const [{ data: sedes }, { data: cuotas }, { data: pagosRecientes }, itemsCuota] = await Promise.all([
    supabase.from("sedes").select("id, nombre").in("id", sedeIds),
    supabase.from("v_estado_cuota_alumno_sede").select("*"),
    // Todos los pagos recientes del alumno (cualquier estado) -- para
    // resolver, por sede, cuál fue el ÚLTIMO intento (pendiente/rechazado/
    // aprobado) y así distinguir "rechazado, todavía sin resolver" de
    // "rechazado hace tiempo pero después se aprobó otro".
    supabase
      .from("pagos")
      .select("sede_id, monto, estado, medio, created_at")
      .eq("alumno_id", user.id)
      .order("created_at", { ascending: false }),
    calcularItemsCuotaAlumno(supabase, user.id, ["activa", "lista_espera"]),
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

  // Precio de la sede = suma el precio de cada actividad distinta que el
  // alumno hace ahí (a su propia frecuencia semanal), ya con el 20% off en
  // la más cara resuelto contra TODAS sus actividades -- ver el comentario
  // de calcularItemsCuotaAlumno en lib/pagos-calculo-server.ts. Si falta
  // clasificar la actividad de alguna clase, o falta el arancel de alguna
  // frecuencia, no se puede calcular (null).
  function calcularPrecioDeSede(sedeId: string): {
    precio: number | null;
    faltaClasificar: boolean;
    prorateado: boolean;
    clasesDelMes: number | null;
    clasesRestantes: number | null;
  } {
    if (itemsCuota.sedesSinClasificar.has(sedeId)) {
      return { precio: null, faltaClasificar: true, prorateado: false, clasesDelMes: null, clasesRestantes: null };
    }
    if (itemsCuota.sedesSinArancel.has(sedeId)) {
      return { precio: null, faltaClasificar: false, prorateado: false, clasesDelMes: null, clasesRestantes: null };
    }

    const items = itemsCuota.items.filter((i) => i.sedeId === sedeId);
    const prorateado = items.some((i) => i.prorateado);
    return {
      precio: items.reduce((acc, i) => acc + i.precio, 0),
      faltaClasificar: false,
      prorateado,
      clasesDelMes: prorateado ? items.reduce((acc, i) => acc + (i.clasesDelMes ?? 0), 0) : null,
      clasesRestantes: prorateado ? items.reduce((acc, i) => acc + (i.clasesRestantes ?? 0), 0) : null,
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
    } = calcularPrecioDeSede(s.id);
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
