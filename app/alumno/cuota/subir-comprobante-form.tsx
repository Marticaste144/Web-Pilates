"use client";

import { useActionState, useState } from "react";
import { subirComprobantePago } from "@/lib/alumno/comprobante-actions";
import { initialFormState } from "@/lib/form-state";
import { FormAlert } from "@/components/ui/form-alert";
import { Button } from "@/components/ui/button";

// Formulario chico (no un modal aparte) para adjuntar un comprobante de un
// pago hecho fuera del sistema -- respaldo adicional, no reemplaza a "Pagar
// con Mercado Pago" ni cambia el estado de la cuota solo (la admin lo
// revisa y lo aprueba). key={inputKey} fuerza a remontar el <input
// type="file"> tras un éxito -- es un elemento no controlado, no se puede
// "vaciar" seteando su value por JS. El bump de inputKey se hace en el
// cuerpo del render (comparando contra el state anterior), no en un
// useEffect -- es el patrón que recomienda React para "ajustar estado
// según una prop/valor que cambió" sin el commit extra de un efecto.
export function SubirComprobanteForm({ sedeId }: { sedeId: string }) {
  const [state, formAction, pending] = useActionState(subirComprobantePago, initialFormState);
  const [inputKey, setInputKey] = useState(0);
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state.status === "success") setInputKey((k) => k + 1);
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="sede_id" value={sedeId} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          key={inputKey}
          type="file"
          name="comprobante"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required
          className="max-w-[200px] text-xs text-neutral-600 file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
        />
        <Button type="submit" size="sm" variant="secondary" loading={pending}>
          Subir comprobante
        </Button>
      </div>
      <FormAlert state={state} />
    </form>
  );
}
