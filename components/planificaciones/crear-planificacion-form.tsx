"use client";

import { useState, useTransition } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type CrearFn = (formData: FormData) => Promise<{ ok: boolean; message: string }>;

export function CrearPlanificacionForm({ crear, tipoLabel }: { crear: CrearFn; tipoLabel: string }) {
  const [pending, startTransition] = useTransition();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mostrarForm) {
    return (
      <EmptyState
        title={`Todavía no hay una planificación ${tipoLabel}`}
        description="Creá la primera para empezar a cargar días, bloques y ejercicios."
        action={
          <Button type="button" onClick={() => setMostrarForm(true)}>
            Crear planificación
          </Button>
        }
      />
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-card border border-neutral-200 bg-white p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const r = await crear(formData);
          if (!r.ok) setError(r.message);
        });
      }}
    >
      <Field label="Título" hint="Ej. Septiembre 2026 -- opcional, se puede completar después.">
        <Input name="titulo" placeholder="Septiembre 2026" />
      </Field>
      <Field label="Objetivo general">
        <Textarea name="objetivo_general" rows={2} placeholder="Ej. Mejorar fuerza y estabilidad..." />
      </Field>
      <Field label="Observaciones">
        <Textarea name="observaciones" rows={2} />
      </Field>
      {error && <p className="text-sm text-error-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          Crear planificación
        </Button>
        <Button type="button" variant="ghost" onClick={() => setMostrarForm(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
