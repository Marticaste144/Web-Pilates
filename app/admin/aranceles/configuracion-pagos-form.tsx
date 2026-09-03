"use client";

import { useActionState } from "react";
import { actualizarConfiguracionPagos } from "@/lib/admin/configuracion-pagos-actions";
import { initialFormState } from "@/lib/form-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100";

// Sin integración de pagos: esto son solo los datos de destino que el
// alumno usa para transferir a mano desde su banco/billetera y después
// subir el comprobante -- ver app/alumno/cuota/cuota-panel.tsx.
export function ConfiguracionPagosForm({
  aliasTransferencia,
  cbuTransferencia,
  titularTransferencia,
  aliasMercadopago,
  diasTolerancia,
}: {
  aliasTransferencia: string | null;
  cbuTransferencia: string | null;
  titularTransferencia: string | null;
  aliasMercadopago: string | null;
  diasTolerancia: number | null;
}) {
  const [state, formAction, pending] = useActionState(actualizarConfiguracionPagos, initialFormState);

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-neutral-900">Datos para transferencia</h2>
        <p className="mt-1 text-sm text-neutral-500">
          El alumno ve estos datos en &ldquo;Mi cuota&rdquo; para transferir y después subir el comprobante -- no hay
          pago automático, todo pago se confirma a mano acá en Admin.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Titular
            <input
              type="text"
              name="titular_transferencia"
              defaultValue={titularTransferencia ?? ""}
              placeholder="Nombre y apellido"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Cuenta DNI / Alias
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
            Mercado Pago / Alias
            <input
              type="text"
              name="alias_mercadopago"
              defaultValue={aliasMercadopago ?? ""}
              placeholder="alias.de.mercadopago"
              className={inputClass}
            />
          </label>
        </div>
        <p className="text-xs text-neutral-400">
          Es otro destino más al que el alumno puede transferir a mano -- no integra ni redirige a Mercado Pago.
        </p>

        <div className="border-t border-neutral-100 pt-4">
          <label className="flex max-w-xs flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Días de tolerancia después del día 10
            <input
              type="number"
              name="dias_tolerancia"
              min={0}
              defaultValue={diasTolerancia ?? ""}
              placeholder="Todavía sin confirmar"
              className={inputClass}
            />
          </label>
          <p className="mt-1.5 text-xs text-neutral-400">
            Pasado el día 10 + estos días, si sigue impago y sin comprobante en revisión se suspende la inscripción y
            se libera el cupo. Dejalo vacío hasta confirmar el número con Laura -- mientras esté vacío, nadie se
            suspende automáticamente.
          </p>
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
