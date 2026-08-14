import { createClient } from "@/lib/supabase/server";
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
    { data: alumnos, error: errorAlumnos },
    { data: sedes, error: errorSedes },
  ] = await Promise.all([
    supabase
      .from("pagos")
      .select("id, alumno_id, sede_id, monto, medio, created_at")
      .eq("estado", "pendiente")
      .not("comprobante_url", "is", null)
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, nombre, apellido"),
    supabase.from("sedes").select("id, nombre"),
  ]);

  if (errorPagos) console.error("[comprobantes-data] error leyendo pagos pendientes", errorPagos);
  if (errorAlumnos) console.error("[comprobantes-data] error leyendo profiles", errorAlumnos);
  if (errorSedes) console.error("[comprobantes-data] error leyendo sedes", errorSedes);

  const alumnoPorId = new Map((alumnos ?? []).map((a) => [a.id, a]));
  const sedeNombrePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));

  return (pagos ?? []).map((p): ComprobantePendienteItem => {
    const alumno = alumnoPorId.get(p.alumno_id);
    return {
      pagoId: p.id,
      alumnoId: p.alumno_id,
      alumnoNombre: alumno ? `${alumno.nombre} ${alumno.apellido}` : "?",
      sedeNombre: sedeNombrePorId.get(p.sede_id) ?? "?",
      monto: p.monto,
      medio: p.medio,
      createdAt: p.created_at,
    };
  });
}
