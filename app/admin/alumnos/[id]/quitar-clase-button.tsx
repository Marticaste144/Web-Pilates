"use client";

import { quitarAlumnaDeClase } from "@/lib/admin/alumnos-actions";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function QuitarClaseButton({ alumnoId, inscripcionId }: { alumnoId: string; inscripcionId: string }) {
  return (
    <ConfirmButton
      action={() => quitarAlumnaDeClase(alumnoId, inscripcionId)}
      triggerLabel="Quitar"
      confirmTitle="¿Quitar de esta clase?"
      confirmDescription="Se da de baja la inscripción -- no se borra el historial de asistencias ya tomadas. Si hay lista de espera, se libera el lugar."
      confirmLabel="Sí, quitar"
    />
  );
}
