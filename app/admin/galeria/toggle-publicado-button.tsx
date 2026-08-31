"use client";

import { useTransition } from "react";
import { togglePublicadoGaleria } from "@/lib/admin/galeria-actions";

export function TogglePublicadoButton({ id, publicado }: { id: string; publicado: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          void togglePublicadoGaleria(id, !publicado);
        })
      }
      className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
        publicado ? "bg-success-100 text-success-700" : "bg-neutral-200 text-neutral-600"
      }`}
    >
      {publicado ? "Publicado" : "Oculto"}
    </button>
  );
}
