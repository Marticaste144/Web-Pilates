"use client";

import { useActionState } from "react";
import { darAccesoAlumna } from "@/lib/admin/alumnos-actions";
import { initialFormState } from "@/lib/form-state";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

// "Dar acceso a MUV": vincula esta MISMA alumna a una cuenta nueva de Auth --
// nunca crea otra alumna. El email lo confirma/ingresa la admin acá (nunca
// se inventa uno, y si la alumna ya tenía uno cargado en el alta manual, se
// precarga para no tener que volver a tipearlo).
export function DarAccesoForm({ alumnoId, emailSugerido }: { alumnoId: string; emailSugerido: string | null }) {
  const [state, action, pending] = useActionState(darAccesoAlumna, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="alumno_id" value={alumnoId} />
      <Field label="Email de la alumna" hint="Se le manda una invitación para que elija su propia contraseña.">
        <Input name="email" type="email" required defaultValue={emailSugerido ?? ""} />
      </Field>
      <FormAlert state={state} />
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={pending}>
          Enviar invitación
        </Button>
      </div>
    </form>
  );
}
