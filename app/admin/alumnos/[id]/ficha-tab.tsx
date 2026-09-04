"use client";

import { useState } from "react";
import type { FichaEvaluacion, PruebasFuncionales, SedeOption } from "@/lib/fichas-evaluacion-data";
import { FichaDatosForm } from "@/components/fichas-evaluacion/ficha-datos-form";
import { PruebasFuncionalesForm } from "@/components/fichas-evaluacion/pruebas-funcionales-form";
import { ObjetivosContactoForm } from "@/components/fichas-evaluacion/objetivos-contacto-form";
import { Card } from "@/components/ui/card";

type SubTab = "iniciales" | "antecedentes" | "pruebas" | "objetivos";

const SUBTABS: { key: SubTab; label: string }[] = [
  { key: "iniciales", label: "Datos iniciales" },
  { key: "antecedentes", label: "Antecedentes" },
  { key: "pruebas", label: "Pruebas funcionales" },
  { key: "objetivos", label: "Objetivos y disponibilidad" },
];

function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

// Ficha de admisión real (3 páginas del PDF) organizada en 4 subtabs en vez
// de un scroll único -- reutiliza los mismos 3 formularios/acciones de
// siempre (FichaDatosForm ahora puede mostrar solo una de sus dos mitades
// vía `seccion`, ver ese archivo -- sigue siendo UN solo submit por mitad
// "Datos iniciales"/"Antecedentes", nada se duplica ni se pierde al
// guardar). Navegación lateral en desktop, subtabs horizontales en mobile.
export function FichaTab({
  ficha,
  pruebas,
  sedes,
}: {
  ficha: FichaEvaluacion;
  pruebas: PruebasFuncionales | null;
  sedes: SedeOption[];
}) {
  const [sub, setSub] = useState<SubTab>("iniciales");

  return (
    <Card padded={false} className="flex flex-col sm:flex-row">
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-neutral-100 p-2 sm:w-48 sm:flex-col sm:border-b-0 sm:border-r sm:p-3">
        {SUBTABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSub(t.key)}
            className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
              sub === t.key ? "bg-primary-50 text-primary-700" : "text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1 p-4 sm:p-5">
        {ficha.existe ? (
          <p className="mb-3 text-xs text-neutral-500">
            Ficha N.º {ficha.numero} · Evaluación del {formatearFecha(ficha.fechaEvaluacion!)}
            {ficha.profesionalEvaluadorNombre && ` · Evaluó: ${ficha.profesionalEvaluadorNombre}`}
          </p>
        ) : (
          <p className="mb-3 text-xs text-neutral-400">Todavía no hay ficha de admisión cargada para este alumno.</p>
        )}

        {(sub === "iniciales" || sub === "antecedentes") && (
          <FichaDatosForm ficha={ficha} sedes={sedes} seccion={sub} />
        )}
        {sub === "pruebas" && <PruebasFuncionalesForm alumnoId={ficha.alumnoId} pruebas={pruebas} />}
        {sub === "objetivos" && <ObjetivosContactoForm ficha={ficha} />}
      </div>
    </Card>
  );
}
