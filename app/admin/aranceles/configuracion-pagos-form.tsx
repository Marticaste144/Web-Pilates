"use client";

import { useActionState, useState } from "react";
import { actualizarConfiguracionPagos } from "@/lib/admin/configuracion-pagos-actions";
import { calcularRecargoMercadoPago } from "@/lib/recargo-mercadopago";
import { initialFormState } from "@/lib/form-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100";

export function ConfiguracionPagosForm({
  recargoMercadopagoPct,
  aliasTransferencia,
  cbuTransferencia,
  titularTransferencia,
}: {
  recargoMercadopagoPct: number;
  aliasTransferencia: string | null;
  cbuTransferencia: string | null;
  titularTransferencia: string | null;
}) {
  const [state, formAction, pending] = useActionState(actualizarConfiguracionPagos, initialFormState);
  const [pctPreview, setPctPreview] = useState(recargoMercadopagoPct);

  const ejemploBase = 41000;
  const recargoEjemplo = calcularRecargoMercadoPago(ejemploBase, pctPreview);

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-neutral-900">Recargo de Mercado Pago y transferencias</h2>
        <p className="mt-1 text-sm text-neutral-500">
          El recargo se le suma al alumno solo si paga con Mercado Pago -- por transferencia se paga el valor exacto
          de la cuota, sin recargo.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          % de recargo por Mercado Pago
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="recargo_mercadopago_pct"
              min={0}
              max={99}
              step="0.01"
              defaultValue={recargoMercadopagoPct}
              onChange={(e) => setPctPreview(Number(e.target.value) || 0)}
              className={`max-w-[140px] ${inputClass}`}
            />
            <span className="text-neutral-400">%</span>
          </div>
        </label>

        {pctPreview > 0 && (
          <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            Ejemplo: una cuota de ${ejemploBase.toLocaleString("es-AR")} se cobra ${(ejemploBase + recargoEjemplo).toLocaleString("es-AR")} por Mercado Pago
            (recargo de ${recargoEjemplo.toLocaleString("es-AR")}) -- a MUV le sigue llegando el neto de ${ejemploBase.toLocaleString("es-AR")}.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Alias
            <input
              type="text"
              name="alias_transferencia"
              defaultValue={aliasTransferencia ?? ""}
              placeholder="muv.pilates"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            CBU
            <input
              type="text"
              name="cbu_transferencia"
              defaultValue={cbuTransferencia ?? ""}
              placeholder="0000000000000000000000"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Titular de la cuenta
            <input
              type="text"
              name="titular_transferencia"
              defaultValue={titularTransferencia ?? ""}
              placeholder="Nombre y apellido"
              className={inputClass}
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" loading={pending} className="w-fit">
            Guardar
          </Button>
          {state.status === "error" && <p className="text-xs text-error-600">{state.message}</p>}
          {state.status === "success" && <p className="text-xs text-success-600">Guardado</p>}
        </div>
      </form>
    </Card>
  );
}
