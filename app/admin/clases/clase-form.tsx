"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/admin/form-state";
import { initialFormState } from "@/lib/admin/form-state";
import type { ProfesorSelectItem, SedeItem, ClaseListItem } from "@/lib/admin/clases-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";

const inputClass =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#2f7cd6] focus:outline-none";

export function ClaseForm({
  action,
  sedes,
  profesores,
  clase,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  sedes: SedeItem[];
  profesores: ProfesorSelectItem[];
  clase?: ClaseListItem;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {clase && <input type="hidden" name="id" value={clase.id} />}

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Sede
          <select name="sede_id" defaultValue={clase?.sedeId ?? ""} required className={inputClass}>
            <option value="" disabled>
              Elegir sede
            </option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Profesor/a
          <select name="profesor_id" defaultValue={clase?.profesorId ?? ""} required className={inputClass}>
            <option value="" disabled>
              Elegir profesor/a
            </option>
            {profesores.map((p) => (
              <option key={p.profileId} value={p.profileId}>
                {p.nombre} {p.apellido}
                {!p.activo ? " (inactivo)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Día
          <select name="dia_semana" defaultValue={clase?.diaSemana ?? ""} required className={inputClass}>
            <option value="" disabled>
              Elegir día
            </option>
            {DIAS_SEMANA.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Hora inicio
          <input
            type="time"
            name="hora_inicio"
            defaultValue={clase?.horaInicio?.slice(0, 5) ?? ""}
            required
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Hora fin
          <input
            type="time"
            name="hora_fin"
            defaultValue={clase?.horaFin?.slice(0, 5) ?? ""}
            required
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Cupo
          <input
            type="number"
            name="cupo"
            min={1}
            defaultValue={clase?.cupo ?? 8}
            required
            className={`${inputClass} w-20`}
          />
        </label>
      </div>

      {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      {state.status === "success" && <p className="text-sm text-emerald-600">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-[#2f7cd6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2568b8] disabled:opacity-50"
      >
        {pending ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}
