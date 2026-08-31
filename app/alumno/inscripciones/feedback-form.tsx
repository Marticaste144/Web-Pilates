"use client";

import { useActionState, useState } from "react";
import { dejarFeedback } from "@/lib/alumno/feedback-actions";
import { initialFormState } from "@/lib/form-state";
import { Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

export function FeedbackForm({ claseId, fecha }: { claseId: string; fecha: string }) {
  const [abierto, setAbierto] = useState(false);
  const [state, action, pending] = useActionState(dejarFeedback, initialFormState);

  if (state.status === "success") {
    return <p className="text-xs font-medium text-success-700">{state.message}</p>;
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-xs font-medium text-primary-600 hover:underline"
      >
        Dejar comentario sobre la clase
      </button>
    );
  }

  return (
    <form action={action} className="flex w-full max-w-xs flex-col gap-2">
      <input type="hidden" name="clase_id" value={claseId} />
      <input type="hidden" name="fecha" value={fecha} />
      <Textarea
        name="comentario"
        rows={2}
        maxLength={1000}
        required
        placeholder="Ej. Me quedó doliendo la zona lumbar..."
      />
      <FormAlert state={state} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={pending}>
          Enviar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
