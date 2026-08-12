"use client";

import { useActionState } from "react";
import { actualizarArancel } from "@/lib/admin/aranceles-actions";
import { initialFormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";

export function ArancelCell({
  sedeId,
  clasesPorSemana,
  valorMensual,
}: {
  sedeId: string;
  clasesPorSemana: number;
  valorMensual: number;
}) {
  const [state, formAction, pending] = useActionState(actualizarArancel, initialFormState);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="sede_id" value={sedeId} />
      <input type="hidden" name="clases_por_semana" value={clasesPorSemana} />
      <div className="flex items-center gap-2">
        <span className="text-neutral-400">$</span>
        <input
          type="number"
          name="valor_mensual"
          min={1}
          defaultValue={valorMensual}
          className="w-20 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
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
