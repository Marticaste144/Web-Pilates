"use client";

import { useTransition } from "react";

// Compartido entre Admin (cambiarActivaClase, cualquier clase) y Profesor
// (cambiarActivaMiClase, solo las propias -- la RLS ya lo garantiza) -- la
// acción concreta se pasa por prop, este componente no sabe ni le importa
// quién puede llamarla.
export function ToggleActivaButton({
  id,
  activa,
  action,
}: {
  id: string;
  activa: boolean;
  action: (id: string, activa: boolean) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => action(id, !activa))}
      className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
        activa ? "bg-success-100 text-success-700" : "bg-neutral-200 text-neutral-600"
      }`}
    >
      {activa ? "Activa" : "Inactiva"}
    </button>
  );
}
