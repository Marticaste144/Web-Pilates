"use client";

import { useState, useTransition } from "react";
import { iniciarPagoMercadoPago } from "@/lib/alumno/pago-actions";

export function PagarButton({ sedeId }: { sedeId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            // En éxito esto redirige a Mercado Pago y no vuelve a ejecutar
            // el código de acá abajo -- solo llegamos a leer "result" si
            // falló antes de llegar a la pasarela.
            const result = await iniciarPagoMercadoPago(sedeId);
            if (result && !result.ok) setError(result.message);
          })
        }
        className="rounded-lg bg-[#2f7cd6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2568b8] disabled:opacity-50"
      >
        {pending ? "Redirigiendo..." : "Pagar con Mercado Pago"}
      </button>
      {error && <p className="max-w-[220px] text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
