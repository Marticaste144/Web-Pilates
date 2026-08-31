"use client";

import { tomarTurno } from "@/lib/alumno/turnos-actions";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function TomarTurnoButton({ turnoId }: { turnoId: string }) {
  return (
    <ConfirmButton
      variant="button"
      tone="primary"
      triggerLabel="Tomar este turno"
      confirmTitle="¿Tomar este turno para recuperar una clase?"
      confirmDescription="Vas a quedar anotada en esa sesión puntual. Esto cuenta como una de tus recuperaciones del mes."
      confirmLabel="Sí, tomar el turno"
      action={() => tomarTurno(turnoId)}
    />
  );
}
