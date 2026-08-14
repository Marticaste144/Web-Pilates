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
   * arancel subió) -- es la base sobre la que se calcula el recargo de
   * Mercado Pago y el monto a transferir. Null si no hay un arancel
   * definido para esa frecuencia (mismo caso borde que ya manejan
   * iniciarPagoMercadoPago/subirComprobantePago).
   */
  precioActual: number | null;
  /** Transferencia con comprobante ya subido, esperando que la admin la revise. */
  transferenciaPendiente: { monto: number; createdAt: string } | null;
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
  // iniciarPagoMercadoPago/subirComprobantePago: cuántas clases activas
  // tiene el alumno en esa sede, no un dato guardado.
  const frecuenciaPorSede = new Map<string, number>();
  for (const c of clases ?? []) {
    frecuenciaPorSede.set(c.sede_id, (frecuenciaPorSede.get(c.sede_id) ?? 0) + 1);
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const [{ data: sedes }, { data: cuotas }, { data: aranceles }, { data: pendientes }] = await Promise.all([
    supabase.from("sedes").select("id, nombre").in("id", sedeIds),
    supabase.from("v_estado_cuota_alumno_sede").select("*"),
    supabase
      .from("aranceles")
      .select("sede_id, clases_por_semana, valor_mensual, vigente_desde")
      .in("sede_id", sedeIds)
      .lte("vigente_desde", hoy),
    supabase
      .from("pagos")
      .select("sede_id, monto, created_at")
      .eq("alumno_id", user.id)
      .eq("medio", "transferencia")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false }),
  ]);

  const cuotaPorSede = new Map((cuotas ?? []).map((c) => [c.sede_id, c]));
  const pendientePorSede = new Map<string, { monto: number; createdAt: string }>();
  for (const p of pendientes ?? []) {
    // El primero por sede queda (created_at desc), es el más reciente.
    if (!pendientePorSede.has(p.sede_id)) {
      pendientePorSede.set(p.sede_id, { monto: p.monto, createdAt: p.created_at });
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
    };
  });
}
