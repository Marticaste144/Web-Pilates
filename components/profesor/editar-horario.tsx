"use client";

import { useState } from "react";
import { actualizarMiClase } from "@/lib/profesor/clases-actions";
import { HorarioForm, type HorarioFormClase } from "@/components/clases/horario-form";
import { Card } from "@/components/ui/card";

// Colapsado por default -- el profesor entra a la clase sobre todo para
// tomar asistencia; editar el horario es una acción secundaria, no algo que
// deba ocupar espacio en pantalla todo el tiempo.
export function EditarHorario({
  clase,
  sedes,
  actividadesPorSede,
}: {
  clase: HorarioFormClase;
  sedes: { id: string; nombre: string }[];
  actividadesPorSede: Record<string, { id: string; nombre: string }[]>;
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="self-start text-sm font-medium text-primary-600 hover:underline"
      >
        Editar este horario
      </button>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-neutral-900">Editar horario</h2>
        <button type="button" onClick={() => setAbierto(false)} className="text-sm text-neutral-400 hover:text-neutral-600">
          Cerrar
        </button>
      </div>
      <HorarioForm action={actualizarMiClase} sedes={sedes} actividadesPorSede={actividadesPorSede} clase={clase} submitLabel="Guardar cambios" />
    </Card>
  );
}
