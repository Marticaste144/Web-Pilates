"use client";

import { useState, useTransition } from "react";
import { actualizarMetadataPlanificacion } from "@/lib/planificaciones-actions";
import type { PlanificacionResumen } from "@/lib/planificaciones-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

// Encabezado de la planificación: título/objetivo/observaciones (editables
// solo si es la actual) y quién la creó.
export function MetadataPanel({ plan, readOnly }: { plan: PlanificacionResumen; readOnly: boolean }) {
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-900">{plan.titulo || `Versión ${plan.version}`}</h2>
            {!plan.esActual && <Badge variant="warning">Histórica -- solo lectura</Badge>}
            {plan.esActual && <Badge variant="success">Actual</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            Profesor: {plan.creadoPorNombre} · Creada el {formatearFecha(plan.createdAt)}
          </p>
        </div>
      </div>

      {readOnly ? (
        <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3 text-sm text-neutral-700">
          {plan.objetivoGeneral && (
            <p>
              <span className="font-medium text-neutral-900">Objetivo general: </span>
              {plan.objetivoGeneral}
            </p>
          )}
          {plan.observaciones && (
            <p>
              <span className="font-medium text-neutral-900">Observaciones: </span>
              {plan.observaciones}
            </p>
          )}
        </div>
      ) : (
        <form
          className="flex flex-col gap-3 border-t border-neutral-100 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            setMensaje(null);
            startTransition(async () => {
              const r = await actualizarMetadataPlanificacion(plan.id, formData);
              setMensaje(r.message);
            });
          }}
        >
          <Field label="Título">
            <Input name="titulo" defaultValue={plan.titulo ?? ""} placeholder="Ej. Septiembre 2026" />
          </Field>
          <Field label="Objetivo general">
            <Textarea name="objetivo_general" rows={2} defaultValue={plan.objetivoGeneral ?? ""} />
          </Field>
          <Field label="Observaciones">
            <Textarea name="observaciones" rows={2} defaultValue={plan.observaciones ?? ""} />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" loading={pending} className="self-start">
              Guardar datos
            </Button>
            {mensaje && <p className="text-xs text-neutral-500">{mensaje}</p>}
          </div>
        </form>
      )}
    </Card>
  );
}
