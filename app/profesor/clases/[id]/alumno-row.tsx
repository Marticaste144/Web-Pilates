"use client";

import { useState, useTransition, useActionState } from "react";
import { marcarAsistencia } from "@/lib/profesor/asistencia-actions";
import { actualizarDatosAlumno } from "@/lib/profesor/alumno-actions";
import { initialFormState } from "@/lib/form-state";
import type { AlumnoRosterItem } from "@/lib/profesor/clases-data";

const CUOTA_LABEL: Record<string, { texto: string; clase: string }> = {
  al_dia: { texto: "Cuota al día", clase: "bg-emerald-100 text-emerald-700" },
  por_vencer: { texto: "Cuota por vencer", clase: "bg-amber-100 text-amber-700" },
  vencida: { texto: "Cuota vencida", clase: "bg-red-100 text-red-700" },
  sin_pagos: { texto: "Sin pagos registrados", clase: "bg-slate-100 text-slate-600" },
};

const inputClass =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#2f7cd6] focus:outline-none";

export function AlumnoRow({
  alumno,
  claseId,
  fecha,
}: {
  alumno: AlumnoRosterItem;
  claseId: string;
  fecha: string;
}) {
  const [pending, startTransition] = useTransition();
  const [asistenciaMsg, setAsistenciaMsg] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [editState, editAction, editPending] = useActionState(actualizarDatosAlumno, initialFormState);

  const marcar = (estado: "presente" | "ausente") => {
    startTransition(async () => {
      const result = await marcarAsistencia(claseId, alumno.alumnoId, fecha, estado);
      setAsistenciaMsg(result.message);
    });
  };

  const cuota = CUOTA_LABEL[alumno.cuotaEstado];

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">
            {alumno.nombre} {alumno.apellido}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cuota.clase}`}>
              {cuota.texto}
            </span>
            <button
              type="button"
              onClick={() => setEditando((v) => !v)}
              className="text-xs text-[#2f7cd6] hover:underline"
            >
              {editando ? "Cancelar" : "Editar datos"}
            </button>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => marcar("presente")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${
                alumno.asistenciaEstado === "presente"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              }`}
            >
              Presente
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => marcar("ausente")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${
                alumno.asistenciaEstado === "ausente"
                  ? "bg-slate-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Ausente
            </button>
          </div>
          {asistenciaMsg && <p className="text-xs text-slate-500">{asistenciaMsg}</p>}
        </div>
      </div>

      {editando && (
        <form action={editAction} className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
          <input type="hidden" name="alumno_id" value={alumno.alumnoId} />
          <input type="hidden" name="clase_id" value={claseId} />

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Nombre
            <input name="nombre" defaultValue={alumno.nombre} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Apellido
            <input name="apellido" defaultValue={alumno.apellido} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Teléfono
            <input name="telefono" defaultValue={alumno.telefono ?? ""} className={inputClass} />
          </label>

          <button
            type="submit"
            disabled={editPending}
            className="rounded-lg bg-[#2f7cd6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2568b8] disabled:opacity-50"
          >
            {editPending ? "Guardando..." : "Guardar"}
          </button>

          {editState.status === "error" && <p className="text-xs text-red-600">{editState.message}</p>}
          {editState.status === "success" && (
            <p className="text-xs text-emerald-600">{editState.message}</p>
          )}
        </form>
      )}
    </div>
  );
}
