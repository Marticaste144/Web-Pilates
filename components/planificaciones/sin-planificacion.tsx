"use client";

import { useState } from "react";
import { CrearPlanificacionForm } from "./crear-planificacion-form";
import { CargarExcelForm } from "./cargar-excel-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type CrearFn = (formData: FormData) => Promise<{ ok: boolean; message: string }>;

// Todavía no hay ninguna versión: se ofrecen las dos formas de cargar una
// primera planificación -- Excel (el flujo real de MUV hoy) y estructurada
// (el sistema de días/bloques/ejercicios/semanas, que sigue existiendo tal
// cual). Ninguna se elige "por default": se ve primero el estado vacío y
// recién al tocar un botón aparece el formulario correspondiente.
export function SinPlanificacion({
  tipoLabel,
  crearExcel,
  crearEstructurada,
}: {
  tipoLabel: string;
  crearExcel: CrearFn;
  crearEstructurada: CrearFn;
}) {
  const [modo, setModo] = useState<"ninguno" | "excel" | "estructurada">("ninguno");

  if (modo === "ninguno") {
    return (
      <EmptyState
        title={`Todavía no hay una planificación ${tipoLabel}`}
        description="Subí el Excel que ya se usa en MUV, o cargá una planificación estructurada dentro de MUV."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={() => setModo("excel")}>
              Cargar Excel
            </Button>
            <Button type="button" variant="secondary" onClick={() => setModo("estructurada")}>
              Crear planificación estructurada
            </Button>
          </div>
        }
      />
    );
  }

  if (modo === "excel") {
    return (
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold text-neutral-900">Cargar planificación en Excel</h2>
        <CargarExcelForm subir={crearExcel} tituloBoton="Cargar planificación" />
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setModo("ninguno")}>
          Volver
        </Button>
      </Card>
    );
  }

  return <CrearPlanificacionForm crear={crearEstructurada} tipoLabel={tipoLabel} />;
}
