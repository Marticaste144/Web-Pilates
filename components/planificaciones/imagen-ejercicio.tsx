"use client";

import { useState, useTransition } from "react";
import { guardarImagenEjercicio, eliminarImagenEjercicio } from "@/lib/planificaciones-actions";
import { ImageIcon } from "@/components/ui/icons";

// Miniatura del ejercicio con lightbox (click para ampliar) + subir/quitar
// cuando no es de solo lectura. Mismo patrón que FotoProfesorForm (bucket
// público, upsert por path fijo) pero autoescalado a este tamaño de card --
// ver guardarImagenEjercicio en lib/planificaciones-actions.ts.
export function ImagenEjercicio({
  ejercicioId,
  imagenUrl,
  readOnly,
}: {
  ejercicioId: string;
  imagenUrl: string | null;
  readOnly: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  function subir(archivo: File) {
    setError(null);
    const formData = new FormData();
    formData.set("imagen", archivo);
    startTransition(async () => {
      const r = await guardarImagenEjercicio(ejercicioId, formData);
      if (!r.ok) setError(r.message);
      setInputKey((k) => k + 1);
    });
  }

  function quitar() {
    setError(null);
    startTransition(async () => {
      const r = await eliminarImagenEjercicio(ejercicioId);
      if (!r.ok) setError(r.message);
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      {imagenUrl ? (
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-neutral-200 transition-shadow hover:shadow-md sm:h-20 sm:w-20"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- URL de Storage externa/dinámica, no un asset local de /public. */}
          <img
            src={imagenUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        </button>
      ) : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-neutral-200 text-neutral-300 sm:h-20 sm:w-20">
          <ImageIcon className="h-6 w-6" />
        </span>
      )}

      {!readOnly && (
        <>
          <label className="cursor-pointer text-[11px] font-medium text-primary-600 hover:underline">
            {pending ? "Subiendo..." : imagenUrl ? "Cambiar" : "Agregar foto"}
            <input
              key={inputKey}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo) subir(archivo);
              }}
            />
          </label>
          {imagenUrl && (
            <button type="button" onClick={quitar} disabled={pending} className="text-[11px] text-neutral-400 hover:text-error-600">
              Quitar
            </button>
          )}
        </>
      )}

      {error && <p className="max-w-[6rem] text-center text-[10px] text-error-600">{error}</p>}

      {lightbox && imagenUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightbox(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- misma imagen dinámica, ampliada. */}
          <img src={imagenUrl} alt="" className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}
