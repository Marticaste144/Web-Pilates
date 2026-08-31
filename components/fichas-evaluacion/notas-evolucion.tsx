"use client";

import { useActionState } from "react";
import { agregarNotaEvolucion } from "@/lib/fichas-evaluacion-actions";
import { initialFormState } from "@/lib/form-state";
import type { NotaEvolucion } from "@/lib/fichas-evaluacion-data";
import { Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { EmptyState } from "@/components/ui/empty-state";

function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR");
}

// Historial append-only: la nota nueva se agrega arriba de todo (notas ya
// viene ordenado por fecha/created_at descendente desde el server) -- las
// viejas nunca se editan ni se borran acá.
export function NotasEvolucion({
  alumnoId,
  notas,
  readOnly = false,
}: {
  alumnoId: string;
  notas: NotaEvolucion[];
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(agregarNotaEvolucion, initialFormState);

  return (
    <div className="flex flex-col gap-4">
      {!readOnly && (
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="alumno_id" value={alumnoId} />
          <Textarea
            name="contenido"
            rows={3}
            maxLength={2000}
            placeholder="Nueva entrada de evolución/seguimiento..."
            required
          />
          <FormAlert state={state} />
          <Button type="submit" size="sm" loading={pending} className="self-start">
            Agregar nota
          </Button>
        </form>
      )}

      {notas.length === 0 ? (
        <EmptyState title="Todavía no hay notas de evolución" />
      ) : (
        <div className="flex flex-col divide-y divide-neutral-100 rounded-card border border-neutral-100">
          {notas.map((n) => (
            <div key={n.id} className="flex flex-col gap-1 p-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-xs font-medium text-neutral-500">{n.autorNombre}</p>
                <p className="text-xs text-neutral-400">{formatearFecha(n.fecha)}</p>
              </div>
              <p className="whitespace-pre-wrap text-sm text-neutral-700">{n.contenido}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
