"use client";

import { useActionState, useState } from "react";
import { initialFormState } from "@/lib/form-state";
import { crearAviso } from "@/lib/admin/avisos-actions";
import type { SedeItem } from "@/lib/admin/clases-data";

const inputClass =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#2f7cd6] focus:outline-none";

export function AvisoForm({ sedes }: { sedes: SedeItem[] }) {
  const [state, formAction, pending] = useActionState(crearAviso, initialFormState);
  const [todasLasSedes, setTodasLasSedes] = useState(true);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Título
        <input type="text" name="titulo" required maxLength={120} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Mensaje
        <textarea name="mensaje" required rows={3} className={inputClass} />
      </label>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Desde
          <input type="date" name="fecha_inicio" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Hasta
          <input type="date" name="fecha_fin" required className={inputClass} />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="todas_las_sedes"
          checked={todasLasSedes}
          onChange={(e) => setTodasLasSedes(e.target.checked)}
        />
        Todas las sedes
      </label>

      {!todasLasSedes && (
        <div className="flex flex-wrap gap-3">
          {sedes.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="sede_ids" value={s.id} />
              {s.nombre}
            </label>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Mientras esté activo (entre las fechas elegidas), bloquea inscripciones, bajas y asistencia en
        la(s) sede(s) afectada(s), y manda un email a todos los alumnos y profesores/as de esa(s) sede(s).
      </p>

      {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      {state.status === "success" && <p className="text-sm text-emerald-600">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-[#2f7cd6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2568b8] disabled:opacity-50"
      >
        {pending ? "Publicando..." : "Publicar aviso"}
      </button>
    </form>
  );
}
