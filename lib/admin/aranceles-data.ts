import { createClient } from "@/lib/supabase/server";

export type ArancelItem = {
  sedeId: string;
  sedeNombre: string;
  clasesPorSemana: number;
  valorMensual: number;
  vigenteDesde: string;
};

const FRECUENCIAS = [1, 2, 3, 4];

// Para cada combinación sede + clases/semana, se queda con la fila de
// mayor vigente_desde que ya empezó a regir (aranceles.vigente_desde puede
// tener fechas futuras cargadas de antemano, pero todavía no aplican).
export async function listarArancelesVigentes(): Promise<ArancelItem[]> {
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const [{ data: sedes }, { data: aranceles }] = await Promise.all([
    supabase.from("sedes").select("id, nombre").order("nombre"),
    supabase
      .from("aranceles")
      .select("sede_id, clases_por_semana, valor_mensual, vigente_desde"),
  ]);

  const sedeList = sedes ?? [];
  const arancelRows = aranceles ?? [];

  const result: ArancelItem[] = [];
  for (const sede of sedeList) {
    for (const freq of FRECUENCIAS) {
      const vigente = arancelRows
        .filter(
          (a) => a.sede_id === sede.id && a.clases_por_semana === freq && a.vigente_desde <= hoy,
        )
        .sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))[0];

      if (vigente) {
        result.push({
          sedeId: sede.id,
          sedeNombre: sede.nombre,
          clasesPorSemana: freq,
          valorMensual: vigente.valor_mensual,
          vigenteDesde: vigente.vigente_desde,
        });
      }
    }
  }

  return result;
}
