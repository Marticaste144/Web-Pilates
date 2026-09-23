"use client";

import { useActionState } from "react";
import { crearAlumnaManual } from "@/lib/admin/alumnos-actions";
import { initialFormState } from "@/lib/form-state";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

// Alta manual: la alumna queda cargada SIN cuenta de Auth (sin contraseña,
// sin usuario real creado) -- email es opcional a propósito, nunca se
// inventa uno. Si más adelante quiere usar la web, "Dar acceso a MUV" (en su
// perfil, una vez creada) manda la invitación real sobre esta misma fila --
// nunca se crea una segunda alumna.
export function NuevaAlumnaForm() {
  const [state, action, pending] = useActionState(crearAlumnaManual, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre">
          <Input name="nombre" required />
        </Field>
        <Field label="Apellido">
          <Input name="apellido" required />
        </Field>
        <Field label="Teléfono" hint="Opcional">
          <Input name="telefono" type="tel" />
        </Field>
        <Field label="Email" hint="Opcional -- solo hace falta si más adelante le vas a dar acceso a MUV.">
          <Input name="email" type="email" />
        </Field>
      </div>

      <FormAlert state={state} />

      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          Crear alumno
        </Button>
      </div>
    </form>
  );
}
