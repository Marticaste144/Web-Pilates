"use client";

import { useActionState, useState } from "react";
import { subirGaleriaItem } from "@/lib/admin/galeria-actions";
import { initialFormState } from "@/lib/form-state";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

export function SubirGaleriaForm() {
  const [state, formAction, pending] = useActionState(subirGaleriaItem, initialFormState);
  const [inputKey, setInputKey] = useState(0);
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state.status === "success") setInputKey((k) => k + 1);
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <Field label="Tipo" className="w-40">
          <Select name="tipo" defaultValue="foto">
            <option value="foto">Foto</option>
            <option value="video">Video</option>
          </Select>
        </Field>
        <Field label="Título (opcional)" className="min-w-0 flex-1">
          <Input name="titulo" placeholder="Ej. Elongación de cadena posterior" />
        </Field>
      </div>

      <Field label="Archivo" hint="Foto: JPG/PNG/WEBP. Video: MP4/WEBM/MOV. Máx. 50 MB.">
        <input
          key={inputKey}
          type="file"
          name="archivo"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
          required
          className="w-full text-sm text-neutral-600 file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
        />
      </Field>

      <FormAlert state={state} />

      <Button type="submit" loading={pending} className="self-start">
        Agregar a la galería
      </Button>
    </form>
  );
}
