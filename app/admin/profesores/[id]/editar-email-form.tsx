"use client";

import { useActionState } from "react";
import { actualizarEmailProfesor } from "@/lib/admin/profesores-actions";
import { initialFormState } from "@/lib/form-state";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

// Separado del formulario de datos personales a propósito: cambiar el
// email cambia con qué credencial esta persona inicia sesión, así que
// merece su propia acción explícita en vez de venir mezclado con guardar
// nombre/teléfono. Se permite editarlo directo (no hay que "reinvitar")
// porque quien lo hace es la admin, actuando con la API de administración
// de Supabase (auth.admin.updateUserById con email_confirm: true) -- no
// hace falta que la persona confirme el email nuevo.
export function EditarEmailForm({ profileId, email }: { profileId: string; email: string }) {
  const [state, formAction, pending] = useActionState(actualizarEmailProfesor, initialFormState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="profile_id" value={profileId} />

      <Field
        label="Email de acceso"
        hint="Se usa para iniciar sesión. Al cambiarlo, la próxima vez que entre va a tener que usar el nuevo."
      >
        <Input type="email" name="email" defaultValue={email} required />
      </Field>

      <FormAlert state={state} />

      <Button type="submit" variant="secondary" loading={pending} className="self-start">
        Cambiar email
      </Button>
    </form>
  );
}
