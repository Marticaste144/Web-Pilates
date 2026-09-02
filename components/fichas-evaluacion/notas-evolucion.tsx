"use client";

import { useActionState } from "react";
import { agregarNotaEvolucion } from "@/lib/fichas-evaluacion-actions";
import { initialFormState } from "@/lib/form-state";
import { CATEGORIA_EVOLUCION_LABELS } from "@/lib/fichas-evaluacion-labels";
import type { NotaEvolucion, ClaseOption } from "@/lib/fichas-evaluacion-data";
import type { CategoriaEvolucion } from "@/types/database";
import { Textarea, Field, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const CATEGORIAS = Object.keys(CATEGORIA_EVOLUCION_LABELS) as CategoriaEvolucion[];

const CATEGORIA_VARIANT: Record<CategoriaEvolucion, "neutral" | "warning" | "success" | "info"> = {
  seguimiento_general: "neutral",
  molestia_dolor: "warning",
  mejora_progreso: "success",
  cambio_objetivo: "info",
  adaptacion: "info",
  reevaluacion: "info",
};

function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR");
}

// Historial append-only: la nota nueva se agrega arriba de todo (notas ya
// viene ordenado por fecha/created_at descendente desde el server) -- las
// viejas nunca se editan ni se borran acá.
export function NotasEvolucion({
  alumnoId,
  notas,
  clases,
  readOnly = false,
}: {
  alumnoId: string;
  notas: NotaEvolucion[];
  clases: ClaseOption[];
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(agregarNotaEvolucion, initialFormState);

  return (
    <div className="flex flex-col gap-4">
      {!readOnly && (
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="alumno_id" value={alumnoId} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Categoría">
              <Select name="categoria" defaultValue="seguimiento_general">
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIA_EVOLUCION_LABELS[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Clase relacionada" hint={clases.length === 0 ? "El alumno no tiene clases activas." : undefined}>
              <Select name="clase_id" defaultValue="" disabled={clases.length === 0}>
                <option value="">Sin clase relacionada</option>
                {clases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Textarea name="contenido" rows={3} maxLength={2000} placeholder="Nueva entrada de evolución/seguimiento..." required />
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
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-neutral-500">{n.autorNombre}</p>
                  <Badge variant={CATEGORIA_VARIANT[n.categoria]}>{CATEGORIA_EVOLUCION_LABELS[n.categoria]}</Badge>
                </div>
                <p className="text-xs text-neutral-400">{formatearFecha(n.fecha)}</p>
              </div>
              <p className="whitespace-pre-wrap text-sm text-neutral-700">{n.contenido}</p>
              {n.claseLabel && <p className="text-xs text-neutral-400">Clase: {n.claseLabel}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
