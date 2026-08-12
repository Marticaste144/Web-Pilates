"use client";

import { useState, useTransition } from "react";
import { inscribirseAClase, darseDeBaja } from "@/lib/alumno/inscripciones-actions";
import type { EstadoInscripcion } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";

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

  const darseBaja = async () => {
    if (!miInscripcionId) return { ok: false, message: "" };
    return darseDeBaja(miInscripcionId);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {miEstado === "activa" && (
        <div className="flex items-center gap-2">
          <Badge variant="success">Anotado/a</Badge>
          <ConfirmButton
            action={darseBaja}
            triggerLabel="Darme de baja"
            confirmTitle="¿Darte de baja de esta clase?"
            confirmDescription="Perdés tu lugar. Si hay lista de espera, se lo ofrecemos automáticamente a la siguiente persona."
            confirmLabel="Sí, darme de baja"
          />
        </div>
      )}

      {miEstado === "lista_espera" && (
        <div className="flex items-center gap-2">
          <Badge variant="warning">En lista de espera</Badge>
          <ConfirmButton
            action={darseBaja}
            triggerLabel="Salir de la lista"
            confirmTitle="¿Salir de la lista de espera?"
            confirmDescription="Perdés tu posición. Vas a tener que anotarte de nuevo si cambiás de idea."
            confirmLabel="Sí, salir"
          />
        </div>
      )}

      {miEstado === null && (
        <Button size="sm" loading={pending} onClick={anotarme}>
          Anotarme
        </Button>
      )}

      {message && <p className="max-w-[220px] text-right text-xs text-neutral-500">{message}</p>}
    </div>
  );
}
