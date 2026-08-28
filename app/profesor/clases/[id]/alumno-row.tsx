"use client";

import { useState, useTransition, useActionState } from "react";
import { marcarAsistencia } from "@/lib/profesor/asistencia-actions";
import { actualizarDatosAlumno } from "@/lib/profesor/alumno-actions";
import { initialFormState } from "@/lib/form-state";
import type { AlumnoRosterItem } from "@/lib/profesor/clases-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";

const CUOTA_VARIANT: Record<string, { texto: string; variant: "success" | "warning" | "error" | "neutral" }> = {
  al_dia: { texto: "Cuota al día", variant: "success" },
  por_vencer: { texto: "Cuota por vencer", variant: "warning" },
  vencida: { texto: "Cuota vencida", variant: "error" },
  sin_pagos: { texto: "Sin pagos registrados", variant: "neutral" },
};

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

  const cuota = CUOTA_VARIANT[alumno.cuotaEstado];

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-neutral-900">
            {alumno.nombre} {alumno.apellido}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={cuota.variant}>{cuota.texto}</Badge>
            <button
              type="button"
              onClick={() => setEditando((v) => !v)}
              className="text-xs font-medium text-primary-600 hover:underline"
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
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                alumno.asistenciaEstado === "presente"
                  ? "bg-success-600 text-white"
                  : "bg-success-100 text-success-700 hover:bg-success-200"
              }`}
            >
              Presente
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => marcar("ausente")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                alumno.asistenciaEstado === "ausente"
                  ? "bg-neutral-600 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Ausente
            </button>
          </div>
          {asistenciaMsg && <p className="text-xs text-neutral-500">{asistenciaMsg}</p>}
        </div>
      </div>

      {editando && (
        <form action={editAction} className="mt-4 flex flex-col gap-3 border-t border-neutral-100 pt-4">
          <input type="hidden" name="alumno_id" value={alumno.alumnoId} />
          <input type="hidden" name="clase_id" value={claseId} />

          <div className="flex flex-wrap gap-3">
            <Field label="Nombre" className="min-w-0 flex-1">
              <Input name="nombre" defaultValue={alumno.nombre} required />
            </Field>
            <Field label="Apellido" className="min-w-0 flex-1">
              <Input name="apellido" defaultValue={alumno.apellido} required />
            </Field>
            <Field label="Teléfono" className="min-w-0 flex-1">
              <Input name="telefono" defaultValue={alumno.telefono ?? ""} />
            </Field>
          </div>

          <FormAlert state={editState} />

          <Button type="submit" loading={editPending} size="sm" className="self-start">
            Guardar
          </Button>
        </form>
      )}
    </Card>
  );
}
