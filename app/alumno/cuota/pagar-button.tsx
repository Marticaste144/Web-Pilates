"use client";

import { useState, useTransition } from "react";
import { iniciarPagoMercadoPago } from "@/lib/alumno/pago-actions";
import { Button } from "@/components/ui/button";

export function PagarButton({ sedeId }: { sedeId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            // En éxito esto redirige a Mercado Pago y no vuelve a ejecutar
            // el código de acá abajo -- solo llegamos a leer "result" si
            // falló antes de llegar a la pasarela.
            const result = await iniciarPagoMercadoPago(sedeId);
            if (result && !result.ok) setError(result.message);
          })
        }
      >
        {pending ? "Redirigiendo..." : "Pagar con Mercado Pago"}
      </Button>
      {error && <p className="max-w-[220px] text-right text-xs text-error-600">{error}</p>}
    </div>
  );
}
