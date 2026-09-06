import { createClient } from "@/lib/supabase/server";
import { mapaIdentidadAlumnos } from "@/lib/alumnos-identidad";
import type { MedioPago } from "@/types/database";

export type ComprobantePendienteItem = {
  pagoId: string;
  alumnoId: string;
  alumnoNombre: string;
  sedeNombre: string;
  monto: number;
  medio: MedioPago;
  createdAt: string;
};

// Todos los comprobantes pendientes de revisión, de todos los alumnos --
// antes solo se podían encontrar entrando alumno por alumno a
// /admin/alumnos/[id]. Ordenados por más viejo primero (los que llevan más
// tiempo esperando revisión, primero).
export async function listarComprobantesPendientes(): Promise<ComprobantePendienteItem[]> {
  const supabase = await createClient();

  const [
    { data: pagos, error: errorPagos },
    { data: sedes, error: errorSedes },
  ] = await Promise.all([
    supabase
      .from("pagos")
      .select("id, alumno_id, sede_id, monto, medio, created_at")
      .eq("estado", "pendiente")
      .not("comprobante_url", "is", null)
      .order("created_at", { ascending: true }),
    supabase.from("sedes").select("id, nombre"),
  ]);

  if (errorPagos) console.error("[comprobantes-data] error leyendo pagos pendientes", errorPagos);
  if (errorSedes) console.error("[comprobantes-data] error leyendo sedes", errorSedes);

  const alumnoIds = [...new Set((pagos ?? []).map((p) => p.alumno_id))];
  const identidadPorId = await mapaIdentidadAlumnos(supabase, alumnoIds);
  const sedeNombrePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));

  return (pagos ?? []).map((p): ComprobantePendienteItem => {
    const identidad = identidadPorId.get(p.alumno_id);
    return {
      pagoId: p.id,
      alumnoId: p.alumno_id,
      alumnoNombre: identidad ? `${identidad.nombre} ${identidad.apellido}` : "?",
      sedeNombre: (p.sede_id && sedeNombrePorId.get(p.sede_id)) || "?",
      monto: p.monto,
      medio: p.medio,
      createdAt: p.created_at,
    };
  });
}
