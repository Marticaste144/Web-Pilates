"use client";

import { useState, useTransition } from "react";
import { darseDeBaja } from "@/lib/alumno/inscripciones-actions";

export function BajaButton({ inscripcionId }: { inscripcionId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await darseDeBaja(inscripcionId);
            setMessage(result.message);
          })
        }
        className="text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        {pending ? "..." : "Darme de baja"}
      </button>
      {message && <p className="text-xs text-slate-500">{message}</p>}
    </div>
  );
}
