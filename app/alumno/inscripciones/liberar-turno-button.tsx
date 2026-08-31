"use client";

import { useState, useTransition } from "react";
import { liberarTurno, cancelarLiberacion } from "@/lib/alumno/turnos-actions";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Button } from "@/components/ui/button";

// Dos estados, derivados directo de la prop (no de un espejo en useState):
// todavía no liberó el turno de hoy, o ya lo liberó y puede deshacerlo. Cada
// acción dispara un revalidatePath en el server -- el próximo render de este
// componente ya llega con turnoLiberadoId actualizado, así que no hace
// falta optimismo local para que el botón cambie de estado.
export function LiberarTurnoButton({
  claseId,
  fecha,
  turnoLiberadoId,
}: {
  claseId: string;
  fecha: string;
  turnoLiberadoId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  if (turnoLiberadoId) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          loading={pending}
          onClick={() => {
            setMensaje(null);
            startTransition(async () => {
              const result = await cancelarLiberacion(turnoLiberadoId);
              setMensaje(result.message);
            });
          }}
        >
          Deshacer -- turno liberado
        </Button>
        {mensaje && <p className="text-xs text-neutral-500">{mensaje}</p>}
      </div>
    );
  }

  return (
    <ConfirmButton
      variant="link"
      tone="destructive"
      triggerLabel="Liberar mi turno de hoy"
      confirmTitle="¿Liberar tu turno de hoy?"
      confirmDescription="Tu inscripción semanal no cambia -- solo le avisás a otra alumna de tu sede que hoy tenés un lugar libre para recuperar."
      confirmLabel="Sí, liberar"
      action={() => liberarTurno(claseId, fecha)}
    />
  );
}
