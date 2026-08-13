"use client";

import { eliminarAviso } from "@/lib/admin/avisos-actions";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function EliminarAvisoButton({ avisoId }: { avisoId: string }) {
  return (
    <ConfirmButton
      action={() => eliminarAviso(avisoId)}
      triggerLabel="Eliminar"
      confirmTitle="¿Eliminar este aviso?"
      confirmDescription="Se desbloquean al instante las inscripciones, bajas y asistencia de la sede afectada para ese rango de fechas -- no hace falta ningún otro paso. No se manda ningún email avisando que se levantó: si corresponde avisar, publicá un aviso nuevo contando la novedad."
      confirmLabel="Sí, eliminar"
    />
  );
}
