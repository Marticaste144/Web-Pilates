import type { TurnoPosible } from "@/types/database";

// Sin dependencias de servidor a propósito (a diferencia de
// fichas-evaluacion-data.ts, que importa lib/supabase/server.ts ->
// next/headers) -- este label lo usan tanto Server como Client Components
// (ej. objetivos-contacto-form.tsx). Un Client Component que importe un
// valor desde un archivo server-only rompe el build -- mismo motivo por el
// que dias-semana.ts vive aparte.
export const TURNO_LABELS: Record<TurnoPosible, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  noche: "Noche",
};
