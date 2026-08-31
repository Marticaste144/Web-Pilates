import { createClient } from "@/lib/supabase/server";

// Fila única (id=true), legible por cualquier autenticado -- ver migración
// 20260901120000_recuperacion_turnos.sql. Si por lo que sea la fila no está
// (no debería pasar, se siembra en la migración), se cae a 2 en vez de
// romper el flujo de recuperación.
const DEFAULT_MAX = 2;

export async function obtenerMaxRecuperacionesPorMes(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("configuracion_recuperaciones")
    .select("max_recuperaciones_por_mes")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    console.error("[configuracion-recuperaciones] no se pudo leer la configuración", error);
    return DEFAULT_MAX;
  }

  return data?.max_recuperaciones_por_mes ?? DEFAULT_MAX;
}
