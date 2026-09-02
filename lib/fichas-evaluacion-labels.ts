import type { CategoriaEvolucion, TurnoPosible } from "@/types/database";

// Sin dependencias de servidor a propósito (a diferencia de
// fichas-evaluacion-data.ts, que importa lib/supabase/server.ts ->
// next/headers) -- estos labels los usan tanto Server como Client
// Components (ej. notas-evolucion.tsx, objetivos-contacto-form.tsx). Un
// Client Component que importe un valor desde un archivo server-only rompe
// el build -- mismo motivo por el que dias-semana.ts vive aparte.
export const CATEGORIA_EVOLUCION_LABELS: Record<CategoriaEvolucion, string> = {
  seguimiento_general: "Seguimiento general",
  molestia_dolor: "Molestia / dolor",
  mejora_progreso: "Mejora / progreso",
  cambio_objetivo: "Cambio de objetivo",
  adaptacion: "Adaptación",
  reevaluacion: "Reevaluación",
};

export const TURNO_LABELS: Record<TurnoPosible, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  noche: "Noche",
};
