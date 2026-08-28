"use client";

import { aprobarComprobante } from "@/lib/admin/pagos-actions";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function AprobarComprobanteButton({ pagoId }: { pagoId: string }) {
  return (
    <ConfirmButton
      action={() => aprobarComprobante(pagoId)}
      triggerLabel="Aprobar"
      tone="primary"
      confirmTitle="¿Aprobar este comprobante?"
      confirmDescription="La cuota de esta sede pasa a estar al día al instante, con tu usuario y la fecha de hoy como respaldo."
      confirmLabel="Sí, aprobar"
    />
  );
}
