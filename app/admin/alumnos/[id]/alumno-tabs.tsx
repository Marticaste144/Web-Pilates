"use client";

import { useState, type ReactNode } from "react";

type TabKey = "resumen" | "clases" | "cuota" | "ficha" | "evolucion" | "planificacion";

const TODAS_LAS_TABS: { key: TabKey; label: string }[] = [
  { key: "resumen", label: "Resumen" },
  { key: "clases", label: "Clases" },
  { key: "cuota", label: "Cuota y pagos" },
  { key: "ficha", label: "Ficha y evaluación" },
  { key: "evolucion", label: "Evolución" },
  { key: "planificacion", label: "Planificación" },
];

// Perfil de alumno de Admin reorganizado en pestañas (antes: scroll único
// larguísimo con todo apilado). Cada panel llega ya renderizado desde el
// Server Component contenedor (page.tsx) -- este componente solo decide
// cuál mostrar, sin volver a pedir datos ni duplicar ninguna query/acción.
// "Planificación" se omite directamente de la lista cuando no corresponde
// (alumno que solo hace Pilates -- ver lib/planificaciones-data.ts,
// alumnoUsaPlanificacion, la misma función que ya usa el perfil del
// profesor), no se muestra vacía ni deshabilitada.
const TAB_KEYS = TODAS_LAS_TABS.map((t) => t.key);

function esTabKey(valor: string | undefined): valor is TabKey {
  return TAB_KEYS.includes(valor as TabKey);
}

export function AlumnoTabs({
  mostrarPlanificacion,
  tabInicial,
  resumen,
  clases,
  cuota,
  ficha,
  evolucion,
  planificacion,
}: {
  mostrarPlanificacion: boolean;
  /** De ?tab= en la URL -- permite que "Ver todas sus clases"/"Ver evolución completa" salten directo a esa pestaña (ver page.tsx). El cambio normal entre tabs, con los botones de acá abajo, es 100% client-side después de esto. */
  tabInicial?: string;
  resumen: ReactNode;
  clases: ReactNode;
  cuota: ReactNode;
  ficha: ReactNode;
  evolucion: ReactNode;
  planificacion: ReactNode;
}) {
  const tabs = TODAS_LAS_TABS.filter((t) => t.key !== "planificacion" || mostrarPlanificacion);
  const defecto = esTabKey(tabInicial) && tabs.some((t) => t.key === tabInicial) ? tabInicial : "resumen";
  const [activa, setActiva] = useState<TabKey>(defecto);

  const contenido: Record<TabKey, ReactNode> = { resumen, clases, cuota, ficha, evolucion, planificacion };

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={activa === t.key}
            onClick={() => setActiva(t.key)}
            className={`shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
              activa === t.key
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>{contenido[activa]}</div>
    </div>
  );
}
