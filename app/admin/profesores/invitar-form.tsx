"use client";

import { useActionState, useRef, useEffect } from "react";
import { invitarProfesor } from "@/lib/admin/profesores-actions";
import { initialFormState } from "@/lib/form-state";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

export function InvitarProfesorForm() {
  const [state, formAction, pending] = useActionState(invitarProfesor, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <h2 className="font-semibold text-neutral-900">Invitar profesor/a</h2>
      <div className="flex flex-wrap gap-3">
        <Input name="nombre" placeholder="Nombre" required className="w-auto flex-1" />
        <Input name="apellido" placeholder="Apellido" required className="w-auto flex-1" />
        <Input
          name="email"
          type="email"
          placeholder="email@ejemplo.com"
          required
          className="w-auto flex-1"
        />
        <Input name="telefono" placeholder="Teléfono (opcional)" className="w-auto flex-1" />
      </div>

      <FormAlert state={state} />

      <Button type="submit" loading={pending} size="sm" className="self-start">
        Enviar invitación
      </Button>
    </form>
  );
}
