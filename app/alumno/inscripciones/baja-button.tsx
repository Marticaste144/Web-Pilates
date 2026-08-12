"use client";

import { darseDeBaja } from "@/lib/alumno/inscripciones-actions";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function BajaButton({ inscripcionId }: { inscripcionId: string }) {
  return (
    <ConfirmButton
      action={() => darseDeBaja(inscripcionId)}
      triggerLabel="Darme de baja"
      confirmTitle="¿Darte de baja de esta clase?"
      confirmDescription="Perdés tu lugar. Si hay lista de espera, se lo ofrecemos automáticamente a la siguiente persona."
      confirmLabel="Sí, darme de baja"
    />
  );
}
