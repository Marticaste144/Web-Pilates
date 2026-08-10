import { createClient } from "@/lib/supabase/server";
import type { EstadoVisualCuota } from "@/types/database";

export type CuotaSedeItem = {
  sedeId: string;
  sedeNombre: string;
  estado: EstadoVisualCuota | "sin_pagos";
  vencimiento: string | null;
  frecuenciaSemanal: number | null;
  monto: number | null;
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

  const [{ data: sedes }, { data: cuotas }] = await Promise.all([
    supabase.from("sedes").select("id, nombre").in("id", sedeIds),
    supabase.from("v_estado_cuota_alumno_sede").select("*"),
  ]);

  const cuotaPorSede = new Map((cuotas ?? []).map((c) => [c.sede_id, c]));

  return (sedes ?? []).map((s): CuotaSedeItem => {
    const cuota = cuotaPorSede.get(s.id);
    if (!cuota) {
      return {
        sedeId: s.id,
        sedeNombre: s.nombre,
        estado: "sin_pagos",
        vencimiento: null,
        frecuenciaSemanal: null,
        monto: null,
      };
    }
    return {
      sedeId: s.id,
      sedeNombre: s.nombre,
      estado: cuota.estado_visual,
      vencimiento: cuota.vencimiento,
      frecuenciaSemanal: cuota.frecuencia_semanal,
      monto: cuota.monto,
    };
  });
}
