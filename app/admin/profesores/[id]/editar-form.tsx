"use client";

import { useActionState } from "react";
import { actualizarProfesor } from "@/lib/admin/profesores-actions";
import { initialFormState } from "@/lib/form-state";
import type { ProfesorListItem } from "@/lib/admin/profesores-data";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

export function EditarProfesorForm({ profesor }: { profesor: ProfesorListItem }) {
  const [state, formAction, pending] = useActionState(actualizarProfesor, initialFormState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="profile_id" value={profesor.profileId} />

      <Field label="Nombre">
        <Input name="nombre" defaultValue={profesor.nombre} required />
      </Field>
      <Field label="Apellido">
        <Input name="apellido" defaultValue={profesor.apellido} required />
      </Field>
      <Field label="Teléfono">
        <Input name="telefono" defaultValue={profesor.telefono ?? ""} />
      </Field>
      <p className="text-sm text-neutral-500">Email: {profesor.email} (no editable acá)</p>

      <FormAlert state={state} />

      <Button type="submit" loading={pending} className="self-start">
        Guardar cambios
      </Button>
    </form>
  );
}
