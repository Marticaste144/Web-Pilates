"use client";

import { useActionState } from "react";
import { actualizarProfesor } from "@/lib/admin/profesores-actions";
import { initialFormState } from "@/lib/form-state";
import type { ProfesorListItem } from "@/lib/admin/profesores-data";

const inputClass =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#2f7cd6] focus:outline-none";

export function EditarProfesorForm({ profesor }: { profesor: ProfesorListItem }) {
  const [state, formAction, pending] = useActionState(actualizarProfesor, initialFormState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3">
      <input type="hidden" name="profile_id" value={profesor.profileId} />

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Nombre
        <input name="nombre" defaultValue={profesor.nombre} required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Apellido
        <input name="apellido" defaultValue={profesor.apellido} required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Teléfono
        <input name="telefono" defaultValue={profesor.telefono ?? ""} className={inputClass} />
      </label>
      <p className="text-sm text-slate-500">Email: {profesor.email} (no editable acá)</p>

      {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      {state.status === "success" && <p className="text-sm text-emerald-600">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-[#2f7cd6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2568b8] disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
