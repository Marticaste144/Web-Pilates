"use client";

import { marcarPagoEfectivo } from "@/lib/admin/pagos-actions";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function MarcarEfectivoButton({ alumnoId, sedeId }: { alumnoId: string; sedeId: string }) {
  return (
    <ConfirmButton
      action={() => marcarPagoEfectivo(alumnoId, sedeId)}
      triggerLabel="Marcar pagado (efectivo)"
      variant="button"
      tone="primary"
      confirmTitle="¿Marcar esta cuota como pagada en efectivo?"
      confirmDescription="Se registra un pago aprobado por el monto y la frecuencia vigentes de esta sede, con tu usuario y la fecha de hoy como respaldo. La cuota pasa a estar al día al instante."
      confirmLabel="Sí, marcar pagado"
    />
  );
}
