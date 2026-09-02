"use client";

import { useState, type ReactNode } from "react";

type TabKey = "resumen" | "evaluacion" | "planificacion" | "evolucion";

const TODAS_LAS_TABS: { key: TabKey; label: string }[] = [
  { key: "resumen", label: "Resumen" },
  { key: "evaluacion", label: "Evaluación" },
  { key: "planificacion", label: "Planificación" },
  { key: "evolucion", label: "Evolución" },
];

// Perfil del alumno reorganizado en 4 secciones navegables (en vez de un
// scroll largo único) -- "Planificación" se omite directamente de la lista
// de tabs cuando no corresponde (ej. alumna de Pilates), no se muestra vacía
// ni deshabilitada.
export function PerfilAlumnoTabs({
  mostrarPlanificacion,
  resumen,
  evaluacion,
  planificacion,
  evolucion,
}: {
  mostrarPlanificacion: boolean;
  resumen: ReactNode;
  evaluacion: ReactNode;
  planificacion: ReactNode;
  evolucion: ReactNode;
}) {
  const tabs = TODAS_LAS_TABS.filter((t) => t.key !== "planificacion" || mostrarPlanificacion);
  const [activa, setActiva] = useState<TabKey>("resumen");

  const contenido: Record<TabKey, ReactNode> = { resumen, evaluacion, planificacion, evolucion };

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
