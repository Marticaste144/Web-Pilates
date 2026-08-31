"use client";

import { useActionState } from "react";
import { actualizarConfiguracionRecuperaciones } from "@/lib/admin/recuperaciones-config-actions";
import { initialFormState } from "@/lib/form-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100";

export function ConfiguracionRecuperacionesForm({ maxRecuperacionesPorMes }: { maxRecuperacionesPorMes: number }) {
  const [state, formAction, pending] = useActionState(actualizarConfiguracionRecuperaciones, initialFormState);

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-neutral-900">Recuperación de turnos</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Máximo de clases que una alumna puede recuperar por mes (global, todas las sedes juntas). Valor
          provisorio hasta confirmar el número final con la clienta.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex max-w-[220px] flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Recuperaciones por mes
          <input
            type="number"
            name="max_recuperaciones_por_mes"
            min={0}
            step="1"
            defaultValue={maxRecuperacionesPorMes}
            className={inputClass}
          />
        </label>

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" loading={pending} className="w-fit">
            Guardar
          </Button>
          {state.status === "error" && <p className="text-xs text-error-600">{state.message}</p>}
          {state.status === "success" && <p className="text-xs text-success-600">Guardado</p>}
        </div>
      </form>
    </Card>
  );
}
