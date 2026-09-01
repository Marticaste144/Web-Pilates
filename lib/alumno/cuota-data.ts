import { createClient } from "@/lib/supabase/server";
import type { EstadoVisualCuota } from "@/types/database";

export type CuotaSedeItem = {
  sedeId: string;
  sedeNombre: string;
  estado: EstadoVisualCuota | "sin_pagos";
  vencimiento: string | null;
  frecuenciaSemanal: number | null;
  monto: number | null;
  /**
   * Precio vigente HOY para la frecuencia real de este alumno en esta sede
   * (no el monto histórico de su último pago, que puede quedar viejo si el
   * arancel subió) -- es el monto a transferir. Null si no hay un arancel
   * definido para esa frecuencia (mismo caso borde que ya maneja
   * subirComprobantePago).
   */
  precioActual: number | null;
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

  // Frecuencia semanal REAL por sede -- mismo criterio que
  // subirComprobantePago: cuántas clases activas tiene el alumno en esa
  // sede, no un dato guardado.
  const frecuenciaPorSede = new Map<string, number>();
  for (const c of clases ?? []) {
    frecuenciaPorSede.set(c.sede_id, (frecuenciaPorSede.get(c.sede_id) ?? 0) + 1);
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const [{ data: sedes }, { data: cuotas }, { data: aranceles }, { data: pagosRecientes }] = await Promise.all([
    supabase.from("sedes").select("id, nombre").in("id", sedeIds),
    supabase.from("v_estado_cuota_alumno_sede").select("*"),
    supabase
      .from("aranceles")
      .select("sede_id, clases_por_semana, valor_mensual, vigente_desde")
      .in("sede_id", sedeIds)
      .lte("vigente_desde", hoy),
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

  function precioVigente(sedeId: string): number | null {
    const frecuencia = frecuenciaPorSede.get(sedeId);
    if (!frecuencia) return null;
    const vigente = (aranceles ?? [])
      .filter((a) => a.sede_id === sedeId && a.clases_por_semana === frecuencia)
      .sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))[0];
    return vigente?.valor_mensual ?? null;
  }

  return (sedes ?? []).map((s): CuotaSedeItem => {
    const cuota = cuotaPorSede.get(s.id);
    const precioActual = precioVigente(s.id);
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
      transferenciaPendiente,
      ultimoRechazo,
    };
  });
}
