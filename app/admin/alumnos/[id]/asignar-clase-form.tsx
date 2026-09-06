"use client";

import { useState, useTransition } from "react";
import { asignarAlumnaAClase } from "@/lib/admin/alumnos-actions";
import type { ClaseParaAsignar } from "@/lib/admin/clases-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

function diaLabel(dia: number): string {
  return DIAS_SEMANA.find((d) => d.value === dia)?.label ?? String(dia);
}

// Asignación manual: se comporta como una inscripción real (ocupa cupo
// igual, respeta lista de espera si está llena -- ver asignarAlumnaAClase)
// -- nunca un atajo que ignore el cupo. Solo se ofrecen clases activas.
export function AsignarClaseForm({ alumnoId, clases }: { alumnoId: string; clases: ClaseParaAsignar[] }) {
  const [claseId, setClaseId] = useState(clases[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  if (clases.length === 0) {
    return <p className="text-sm text-neutral-400">Todavía no hay clases activas cargadas.</p>;
  }

  const asignar = () => {
    if (!claseId) return;
    setMensaje(null);
    startTransition(async () => {
      const result = await asignarAlumnaAClase(alumnoId, claseId);
      setMensaje(result.message);
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      <Select value={claseId} onChange={(e) => setClaseId(e.target.value)}>
        {clases.map((c) => (
          <option key={c.id} value={c.id}>
            {c.sedeNombre}
            {c.actividadNombre ? ` -- ${c.actividadNombre}` : ""} -- {diaLabel(c.diaSemana)} {c.horaInicio.slice(0, 5)}-
            {c.horaFin.slice(0, 5)} -- Prof. {c.profesorNombre} ({c.inscriptosActivos}/{c.cupo})
          </option>
        ))}
      </Select>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" loading={pending} onClick={asignar}>
          Agregar a esta clase
        </Button>
        {mensaje && <p className="text-xs text-neutral-500">{mensaje}</p>}
      </div>
    </div>
  );
}
