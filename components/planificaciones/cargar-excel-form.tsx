"use client";

import { useState, useTransition } from "react";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

type SubirFn = (formData: FormData) => Promise<{ ok: boolean; message: string }>;

// Compartido entre "Cargar planificación" (primera vez) y "Actualizar
// planificación" (nueva versión) -- ambos reciben la misma forma de acción
// (arma el FormData, sube y valida server-side) y solo cambian el texto y a
// qué Server Action apuntan.
export function CargarExcelForm({
  subir,
  tituloBoton,
  onExito,
}: {
  subir: SubirFn;
  tituloBoton: string;
  onExito?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const r = await subir(formData);
          if (!r.ok) {
            setError(r.message);
            return;
          }
          setInputKey((k) => k + 1);
          onExito?.();
        });
      }}
    >
      <Field label="Título" hint="Ej. Septiembre 2026 -- opcional.">
        <Input name="titulo" placeholder="Septiembre 2026" />
      </Field>
      <Field label="Archivo Excel (.xlsx)">
        <input
          key={inputKey}
          type="file"
          name="archivo"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          required
          className="w-full text-sm text-neutral-600 file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
        />
      </Field>
      {error && <p className="text-sm text-error-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          {tituloBoton}
        </Button>
      </div>
    </form>
  );
}
