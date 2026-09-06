"use client";

import { reenviarInvitacion } from "@/lib/admin/profesores-actions";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function ReenviarInvitacionButton({ profileId }: { profileId: string }) {
  return (
    <ConfirmButton
      action={() => reenviarInvitacion(profileId)}
      triggerLabel="Reenviar invitación"
      pendingLabel="Enviando..."
      variant="link"
      tone="primary"
      confirmTitle="¿Reenviar la invitación?"
      confirmDescription="Le mandamos un nuevo link para que confirme su cuenta y elija contraseña. No se crea ningún profesor nuevo."
      confirmLabel="Sí, reenviar"
    />
  );
}
