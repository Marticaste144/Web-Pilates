"use client";

import { reenviarInvitacionAlumna } from "@/lib/admin/alumnos-actions";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function ReenviarInvitacionAlumnaButton({ alumnoId }: { alumnoId: string }) {
  return (
    <ConfirmButton
      action={() => reenviarInvitacionAlumna(alumnoId)}
      triggerLabel="Reenviar invitación"
      pendingLabel="Enviando..."
      variant="link"
      tone="primary"
      confirmTitle="¿Reenviar la invitación?"
      confirmDescription="Le mandamos un nuevo link para que confirme su cuenta y elija contraseña. No se crea ninguna alumna nueva."
      confirmLabel="Sí, reenviar"
    />
  );
}
