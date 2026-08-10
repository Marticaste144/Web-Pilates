"use client";

import { useTransition } from "react";
import { cambiarActivoProfesor } from "@/lib/admin/profesores-actions";

export function ToggleActivoButton({
  profileId,
  activo,
}: {
  profileId: string;
  activo: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => cambiarActivoProfesor(profileId, !activo))}
      className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
        activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
      }`}
    >
      {activo ? "Activo" : "Inactivo"}
    </button>
  );
}
