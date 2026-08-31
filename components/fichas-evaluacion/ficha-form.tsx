"use client";

import { useActionState } from "react";
import { guardarFicha } from "@/lib/fichas-evaluacion-actions";
import { initialFormState } from "@/lib/form-state";
import type { FichaEvaluacion } from "@/lib/fichas-evaluacion-data";
import { Field, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

function formatearFechaHora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export function FichaForm({ ficha, readOnly = false }: { ficha: FichaEvaluacion; readOnly?: boolean }) {
  const [state, formAction, pending] = useActionState(guardarFicha, initialFormState);

  return (
    <div className="flex flex-col gap-3">
      {ficha.updatedAt ? (
        <p className="text-xs text-neutral-500">
          Última actualización: {formatearFechaHora(ficha.updatedAt)}
          {ficha.actualizadoPorNombre && ` -- ${ficha.actualizadoPorNombre}`}
        </p>
      ) : (
        <p className="text-xs text-neutral-400">Todavía no hay ficha cargada para este alumno.</p>
      )}

      {readOnly ? (
        <p className="whitespace-pre-wrap text-sm text-neutral-700">
          {ficha.doloresMolestias || "Sin dolores/molestias registradas."}
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="alumno_id" value={ficha.alumnoId} />
          <Field label="Dolores o molestias reportadas">
            <Textarea
              name="dolores_molestias"
              rows={4}
              maxLength={2000}
              defaultValue={ficha.doloresMolestias ?? ""}
              placeholder="Ej. Molestia lumbar al flexionar, dolor de rodilla derecha al subir escaleras..."
            />
          </Field>
          <FormAlert state={state} />
          <Button type="submit" size="sm" loading={pending} className="self-start">
            Guardar ficha
          </Button>
        </form>
      )}
    </div>
  );
}
