"use client";

import { rechazarComprobante } from "@/lib/admin/pagos-actions";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function RechazarComprobanteButton({ pagoId }: { pagoId: string }) {
  return (
    <ConfirmButton
      action={() => rechazarComprobante(pagoId)}
      triggerLabel="Rechazar"
      tone="destructive"
      confirmTitle="¿Rechazar este comprobante?"
      confirmDescription="El alumno va a poder subir un comprobante nuevo. Esta acción no se puede deshacer."
      confirmLabel="Sí, rechazar"
    />
  );
}
