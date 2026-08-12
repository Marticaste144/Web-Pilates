"use client";

import { useTransition } from "react";
import { cambiarActivaClase } from "@/lib/admin/clases-actions";

export function ToggleActivaButton({ id, activa }: { id: string; activa: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => cambiarActivaClase(id, !activa))}
      className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
        activa ? "bg-success-100 text-success-700" : "bg-neutral-200 text-neutral-600"
      }`}
    >
      {activa ? "Activa" : "Inactiva"}
    </button>
  );
}
