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
        activo ? "bg-success-100 text-success-700" : "bg-neutral-200 text-neutral-600"
      }`}
    >
      {activo ? "Activo" : "Inactivo"}
    </button>
  );
}
