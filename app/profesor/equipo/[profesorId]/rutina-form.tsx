"use client";

import { useActionState, useState } from "react";
import { guardarRutina } from "@/lib/profesor/rutinas-actions";
import { initialFormState } from "@/lib/form-state";
import type { RutinaProfesor } from "@/lib/profesor/rutinas-data";
import { Card } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { FileIcon } from "@/components/ui/icons";

// key={inputKey} fuerza a remontar el <input type="file"> tras un guardado
// exitoso -- es un elemento no controlado, no se puede "vaciar" seteando su
// value por JS. Mismo patrón que SubirComprobanteForm.
export function RutinaForm({ rutina }: { rutina: RutinaProfesor }) {
  const [state, formAction, pending] = useActionState(guardarRutina, initialFormState);
  const [inputKey, setInputKey] = useState(0);
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state.status === "success") setInputKey((k) => k + 1);
  }

  return (
    <Card>
      <form action={formAction} className="flex flex-col gap-4">
        <Field label="Rutina" hint="Contale a quien te reemplace qué venís dando en esta clase.">
          <Textarea
            name="contenido"
            rows={6}
            maxLength={5000}
            defaultValue={rutina.contenido ?? ""}
            placeholder="Ej. Semana de trabajo de core + movilidad de cadera, progresando a..."
          />
        </Field>

        {rutina.archivoUrl && (
          <a
            href={`/api/profesor/rutinas/${rutina.profesorId}/archivo`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
          >
            <FileIcon className="h-4 w-4" />
            {rutina.archivoNombre ?? "Ver archivo actual"}
          </a>
        )}

        <Field label="Adjuntar archivo" hint="Opcional -- reemplaza al archivo anterior si subís uno nuevo. Imagen o PDF, máx. 10 MB.">
          <input
            key={inputKey}
            type="file"
            name="archivo"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="w-full text-sm text-neutral-600 file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
          />
        </Field>

        <FormAlert state={state} />

        <Button type="submit" loading={pending} className="self-start">
          Guardar rutina
        </Button>
      </form>
    </Card>
  );
}
