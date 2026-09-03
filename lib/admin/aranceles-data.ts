import { createClient } from "@/lib/supabase/server";

export type ArancelItem = {
  sedeId: string;
  sedeNombre: string;
  clasesPorSemana: number;
  valorMensual: number;
  vigenteDesde: string;
};

const FRECUENCIAS = [1, 2, 3, 4];

export type ArancelActividadItem = {
  actividadId: string;
  actividadNombre: string;
  /** 1-4 = veces/semana. 0 = "Libre". */
  clasesPorSemana: number;
  valorMensual: number | null;
  vigenteDesde: string | null;
};

// Frecuencias reales de septiembre por actividad (ver migración
// 20260903130000_aranceles_por_actividad.sql) -- Postural/Pilates van 1-4,
// Funcional/Fuerza/Stretching/Ritmo van 1-3 + "Libre" (0). 4x de ese grupo
// queda deliberadamente sin valor (pendiente $63k/$64k, todavía sin
// confirmar) -- aparece igual en la grilla como "sin definir" para que
// Admin lo pueda cargar apenas Laura lo confirme.
const FRECUENCIAS_FITNESS = [1, 2, 3, 4, 0];
const FRECUENCIAS_ESTANDAR = [1, 2, 3, 4];
const ACTIVIDADES_FITNESS = new Set(["Funcional", "Fuerza", "Stretching", "Ritmo"]);

// Precio vigente por actividad -- modelo nuevo (septiembre en adelante),
// reemplaza a listarArancelesVigentes (sede) como la fuente de precios que
// se usa de verdad para cobrar (ver lib/alumno/cuota-data.ts). Esa función
// vieja no se borra: los aranceles viejos por sede se preservan para el
// historial de pagos ya aprobados, simplemente esta pantalla ya no los
// muestra como editables.
export async function listarArancelesPorActividad(): Promise<ArancelActividadItem[]> {
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const [{ data: actividades }, { data: aranceles }] = await Promise.all([
    supabase.from("actividades").select("id, nombre").order("nombre"),
    supabase.from("aranceles").select("actividad_id, clases_por_semana, valor_mensual, vigente_desde").not("actividad_id", "is", null),
  ]);

  const result: ArancelActividadItem[] = [];
  for (const actividad of actividades ?? []) {
    const frecuencias = ACTIVIDADES_FITNESS.has(actividad.nombre) ? FRECUENCIAS_FITNESS : FRECUENCIAS_ESTANDAR;
    for (const freq of frecuencias) {
      const vigente = (aranceles ?? [])
        .filter((a) => a.actividad_id === actividad.id && a.clases_por_semana === freq && a.vigente_desde <= hoy)
        .sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))[0];

      result.push({
        actividadId: actividad.id,
        actividadNombre: actividad.nombre,
        clasesPorSemana: freq,
        valorMensual: vigente?.valor_mensual ?? null,
        vigenteDesde: vigente?.vigente_desde ?? null,
      });
    }
  }

  return result;
}

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
