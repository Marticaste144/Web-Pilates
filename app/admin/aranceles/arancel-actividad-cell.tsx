"use client";

import { useActionState } from "react";
import { actualizarArancelActividad } from "@/lib/admin/aranceles-actions";
import { initialFormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";

// Mismo patrón que ArancelCell (modelo viejo por sede) pero para el modelo
// nuevo por actividad -- clasesPorSemana=0 es "Libre", no una frecuencia
// inválida. valorMensual null = todavía sin confirmar (ej. el 4x de
// Funcional/Fuerza/Stretching/Ritmo -- ver migración 20260903130000) -- el
// input queda vacío, listo para cargarlo apenas Laura lo confirme.
export function ArancelActividadCell({
  actividadId,
  clasesPorSemana,
  valorMensual,
}: {
  actividadId: string;
  clasesPorSemana: number;
  valorMensual: number | null;
}) {
  const [state, formAction, pending] = useActionState(actualizarArancelActividad, initialFormState);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="actividad_id" value={actividadId} />
      <input type="hidden" name="clases_por_semana" value={clasesPorSemana} />
      <div className="flex items-center gap-2">
        <span className="text-neutral-400">$</span>
        <input
          type="number"
          name="valor_mensual"
          min={1}
          defaultValue={valorMensual ?? ""}
          placeholder="pendiente"
          className="w-24 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
        <Button type="submit" size="sm" loading={pending} className="px-3 py-1">
          Guardar
        </Button>
      </div>
      {state.status === "error" && <p className="text-xs text-error-600">{state.message}</p>}
      {state.status === "success" && <p className="text-xs text-success-600">Guardado</p>}
    </form>
  );
}
