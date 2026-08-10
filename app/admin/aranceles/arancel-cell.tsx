"use client";

import { useActionState } from "react";
import { actualizarArancel } from "@/lib/admin/aranceles-actions";
import { initialFormState } from "@/lib/admin/form-state";

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
        <span className="text-slate-400">$</span>
        <input
          type="number"
          name="valor_mensual"
          min={1}
          defaultValue={valorMensual}
          className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-[#2f7cd6] focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#2f7cd6] px-3 py-1 text-xs font-semibold text-white hover:bg-[#2568b8] disabled:opacity-50"
        >
          {pending ? "..." : "Guardar"}
        </button>
      </div>
      {state.status === "error" && <p className="text-xs text-red-600">{state.message}</p>}
      {state.status === "success" && <p className="text-xs text-emerald-600">Guardado</p>}
    </form>
  );
}
