"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { marcarAsistencia } from "@/lib/profesor/asistencia-actions";
import type { AlumnoRosterItem } from "@/lib/profesor/clases-data";
import type { EstadoAsistencia } from "@/types/database";

// Reemplaza al viejo AlumnoRow: acá el estado de presente/ausente de todas
// las alumnas vive en un solo componente (no una por fila) para que las 3
// cards de resumen (Presentes/Ausentes/Total) se actualicen en vivo con cada
// marca, sin recargar la página. marcarAsistencia sigue siendo la misma
// Server Action de siempre (upsert en `asistencias`) -- acá solo se guarda
// en el estado local el resultado ya confirmado por el server.
export function AsistenciaLista({
  claseId,
  fecha,
  alumnos,
}: {
  claseId: string;
  fecha: string;
  alumnos: AlumnoRosterItem[];
}) {
  const [estados, setEstados] = useState<Record<string, EstadoAsistencia | null>>(() =>
    Object.fromEntries(alumnos.map((a) => [a.alumnoId, a.asistenciaEstado])),
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const valores = Object.values(estados);
  const presentes = valores.filter((e) => e === "presente").length;
  const ausentes = valores.filter((e) => e === "ausente").length;

  function marcar(alumnoId: string, estado: "presente" | "ausente") {
    setPendingId(alumnoId);
    setError(null);
    startTransition(async () => {
      const result = await marcarAsistencia(claseId, alumnoId, fecha, estado);
      if (result.ok) {
        setEstados((prev) => ({ ...prev, [alumnoId]: estado }));
      } else {
        setError(result.message);
      }
      setPendingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-card bg-success-50 p-4 text-center">
          <p className="text-2xl font-bold text-success-700">{presentes}</p>
          <p className="text-xs font-medium text-success-700">Presentes</p>
        </div>
        <div className="rounded-card bg-error-50 p-4 text-center">
          <p className="text-2xl font-bold text-error-600">{ausentes}</p>
          <p className="text-xs font-medium text-error-600">Ausentes</p>
        </div>
        <div className="rounded-card bg-neutral-100 p-4 text-center">
          <p className="text-2xl font-bold text-neutral-900">
            {presentes + ausentes}/{alumnos.length}
          </p>
          <p className="text-xs font-medium text-neutral-500">Total</p>
        </div>
      </div>

      {error && <p className="rounded-xl bg-error-50 px-3.5 py-2.5 text-sm text-error-700">{error}</p>}

      <div className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-card border border-neutral-100 bg-white">
        {alumnos.map((a) => {
          const estado = estados[a.alumnoId];
          const pending = pendingId === a.alumnoId;
          return (
            <div key={a.alumnoId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 truncate font-medium text-neutral-900">
                {a.nombre} {a.apellido}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => marcar(a.alumnoId, "presente")}
                  className={`rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 sm:px-4 sm:py-2 ${
                    estado === "presente"
                      ? "bg-success-500 text-white"
                      : "bg-success-50 text-success-700 hover:bg-success-100"
                  }`}
                >
                  Presente
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => marcar(a.alumnoId, "ausente")}
                  className={`rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 sm:px-4 sm:py-2 ${
                    estado === "ausente"
                      ? "bg-error-500 text-white"
                      : "bg-error-50 text-error-600 hover:bg-error-100"
                  }`}
                >
                  Ausente
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href="/profesor"
        className="inline-flex items-center justify-center rounded-xl bg-secondary-500 px-6 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-secondary-600"
      >
        Guardar asistencia
      </Link>
    </div>
  );
}
