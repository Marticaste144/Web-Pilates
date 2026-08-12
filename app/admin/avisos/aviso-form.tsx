"use client";

import { useActionState, useState } from "react";
import { initialFormState } from "@/lib/form-state";
import { crearAviso } from "@/lib/admin/avisos-actions";
import type { SedeItem } from "@/lib/admin/clases-data";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

export function AvisoForm({ sedes }: { sedes: SedeItem[] }) {
  const [state, formAction, pending] = useActionState(crearAviso, initialFormState);
  const [todasLasSedes, setTodasLasSedes] = useState(true);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Título">
        <Input type="text" name="titulo" required maxLength={120} />
      </Field>

      <Field label="Mensaje">
        <Textarea name="mensaje" required rows={3} />
      </Field>

      <div className="flex flex-wrap gap-3">
        <Field label="Desde" className="flex-1">
          <Input type="date" name="fecha_inicio" required />
        </Field>
        <Field label="Hasta" className="flex-1">
          <Input type="date" name="fecha_fin" required />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
        <input
          type="checkbox"
          name="todas_las_sedes"
          checked={todasLasSedes}
          onChange={(e) => setTodasLasSedes(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-400"
        />
        Todas las sedes
      </label>

      {!todasLasSedes && (
        <div className="flex flex-wrap gap-4 rounded-lg bg-neutral-50 p-3">
          {sedes.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                name="sede_ids"
                value={s.id}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-400"
              />
              {s.nombre}
            </label>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-400">
        Mientras esté activo (entre las fechas elegidas), bloquea inscripciones, bajas y asistencia en
        la(s) sede(s) afectada(s), y manda un email a todos los alumnos y profesores/as de esa(s) sede(s).
      </p>

      <FormAlert state={state} />

      <Button type="submit" loading={pending} className="self-start">
        Publicar aviso
      </Button>
    </form>
  );
}
