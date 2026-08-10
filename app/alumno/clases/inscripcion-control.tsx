"use client";

import { useState, useTransition } from "react";
import { inscribirseAClase, darseDeBaja } from "@/lib/alumno/inscripciones-actions";
import type { EstadoInscripcion } from "@/types/database";

export function InscripcionControl({
  claseId,
  miInscripcionId,
  miEstado,
}: {
  claseId: string;
  miInscripcionId: string | null;
  miEstado: EstadoInscripcion | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const anotarme = () => {
    startTransition(async () => {
      const result = await inscribirseAClase(claseId);
      setMessage(result.message);
    });
  };

  const darseBaja = () => {
    if (!miInscripcionId) return;
    startTransition(async () => {
      const result = await darseDeBaja(miInscripcionId);
      setMessage(result.message);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {miEstado === "activa" && (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
            Anotado/a
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={darseBaja}
            className="text-xs text-red-600 hover:underline disabled:opacity-50"
          >
            Darme de baja
          </button>
        </div>
      )}

      {miEstado === "lista_espera" && (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            En lista de espera
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={darseBaja}
            className="text-xs text-red-600 hover:underline disabled:opacity-50"
          >
            Salir de la lista
          </button>
        </div>
      )}

      {miEstado === null && (
        <button
          type="button"
          disabled={pending}
          onClick={anotarme}
          className="rounded-lg bg-[#2f7cd6] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#2568b8] disabled:opacity-50"
        >
          {pending ? "..." : "Anotarme"}
        </button>
      )}

      {message && <p className="max-w-[220px] text-right text-xs text-slate-500">{message}</p>}
    </div>
  );
}
