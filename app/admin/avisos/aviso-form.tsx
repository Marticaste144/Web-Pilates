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
  // Default = bloquea (comportamiento histórico, el único que existía hasta
  // ahora): que un aviso NO bloquee es el caso nuevo, y hay que elegirlo a
  // propósito. Si el default fuera "no bloquea", un admin apurada que
  // publica "no hay clases el 1° de mayo" sin fijarse en este checkbox
  // dejaría la sede sin bloquear -- un alumno se anotaría/vendría a una
  // clase que en realidad no existe ese día, y nadie se entera hasta que
  // ya es tarde. Al revés (default bloquea, un aviso informativo queda
  // bloqueando sin querer), el error se nota enseguida: alguien no puede
  // anotarse y avisa. Falla más segura -> ese es el default.
  const [bloquea, setBloquea] = useState(true);

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

      <label className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <input
          type="checkbox"
          name="bloquea"
          checked={bloquea}
          onChange={(e) => setBloquea(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-400"
        />
        <span>
          <span className="block text-sm font-medium text-neutral-700">¿Este aviso bloquea las clases?</span>
          <span className="mt-0.5 block text-xs text-neutral-500">
            {bloquea
              ? "Sí: mientras esté vigente, nadie (salvo la admin) va a poder anotarse, darse de baja ni tomar asistencia en la(s) sede(s) afectada(s). Usalo para algo como \"no hay clases por feriado\"."
              : "No: es solo un mensaje informativo (ej. \"traigan agua, va a hacer calor\") -- no bloquea nada, las clases siguen su curso normal."}
          </span>
        </span>
      </label>

      <p className="text-xs text-neutral-400">
        En los dos casos se manda un email a todos los alumnos y profesores/as de la(s) sede(s) afectada(s).
      </p>

      <FormAlert state={state} />

      <Button type="submit" loading={pending} className="self-start">
        Publicar aviso
      </Button>
    </form>
  );
}
