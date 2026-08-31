"use client";

import { useState, useTransition } from "react";
import { confirmarAsistencia } from "@/lib/alumno/asistencia-actions";
import { Button } from "@/components/ui/button";

export function ConfirmarAsistenciaButton({ claseId, fecha }: { claseId: string; fecha: string }) {
  const [confirmado, setConfirmado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (confirmado) {
    return <span className="text-sm font-medium text-success-700">Asistencia confirmada ✓</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        loading={pending}
        onClick={() => {
          setMensaje(null);
          startTransition(async () => {
            const result = await confirmarAsistencia(claseId, fecha);
            setMensaje(result.message);
            if (result.ok) setConfirmado(true);
          });
        }}
      >
        Confirmar asistencia de hoy
      </Button>
      {mensaje && <p className="text-xs text-neutral-500">{mensaje}</p>}
    </div>
  );
}
