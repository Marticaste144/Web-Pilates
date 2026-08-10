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
        activa ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
      }`}
    >
      {activa ? "Activa" : "Inactiva"}
    </button>
  );
}
