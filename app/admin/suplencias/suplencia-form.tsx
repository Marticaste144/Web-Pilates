"use client";

import { useActionState } from "react";
import { crearSuplencia } from "@/lib/admin/suplencias-actions";
import { initialFormState } from "@/lib/form-state";
import type { ProfesorListItem } from "@/lib/admin/profesores-data";
import { Field, Select, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

export function SuplenciaForm({ profesores }: { profesores: ProfesorListItem[] }) {
  const [state, formAction, pending] = useActionState(crearSuplencia, initialFormState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Profesor reemplazado">
          <Select name="profesor_original" required defaultValue="">
            <option value="" disabled>
              Elegí un profesor...
            </option>
            {profesores.map((p) => (
              <option key={p.profileId} value={p.profileId}>
                {p.nombre} {p.apellido}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Profesor suplente">
          <Select name="profesor_suplente" required defaultValue="">
            <option value="" disabled>
              Elegí un profesor...
            </option>
            {profesores.map((p) => (
              <option key={p.profileId} value={p.profileId}>
                {p.nombre} {p.apellido}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Desde">
          <Input type="date" name="fecha_inicio" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </Field>
        <Field label="Hasta (opcional)" hint="Vacío = indefinida, hasta que la finalices a mano.">
          <Input type="date" name="fecha_fin" />
        </Field>
      </div>

      <FormAlert state={state} />

      <Button type="submit" loading={pending} className="self-start">
        Crear suplencia
      </Button>
    </form>
  );
}
