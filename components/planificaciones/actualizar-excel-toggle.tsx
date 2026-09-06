"use client";

import { useState } from "react";
import { CargarExcelForm } from "./cargar-excel-form";
import { Button } from "@/components/ui/button";

type SubirFn = (formData: FormData) => Promise<{ ok: boolean; message: string }>;

// "Actualizar planificación" -- crea una versión NUEVA (nunca reemplaza el
// archivo de la actual, ver actualizarPlanificacionExcel). Colapsado por
// defecto para no ensuciar la vista principal, mismo criterio que "Nueva
// versión" en metadata-panel.tsx (planificación estructurada).
export function ActualizarExcelToggle({ subir }: { subir: SubirFn }) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <Button type="button" size="sm" variant="secondary" onClick={() => setAbierto(true)}>
        Actualizar planificación
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-neutral-50 p-3">
      <p className="text-sm text-neutral-600">
        Se guarda como una versión nueva -- la actual queda archivada en el historial, tal como está ahora.
      </p>
      <CargarExcelForm subir={subir} tituloBoton="Guardar nueva versión" onExito={() => setAbierto(false)} />
      <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setAbierto(false)}>
        Cancelar
      </Button>
    </div>
  );
}
