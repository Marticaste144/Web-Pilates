import { listarEstadoCuotaAlumno } from "@/lib/alumno/cuota-data";
import { PagarButton } from "./pagar-button";

export const dynamic = "force-dynamic";

const ESTADO_LABEL: Record<string, { texto: string; clase: string }> = {
  al_dia: { texto: "Al día", clase: "bg-emerald-100 text-emerald-700" },
  por_vencer: { texto: "Por vencer", clase: "bg-amber-100 text-amber-700" },
  vencida: { texto: "Vencida", clase: "bg-red-100 text-red-700" },
  sin_pagos: { texto: "Sin pagos registrados", clase: "bg-slate-100 text-slate-600" },
};

const BANNER: Record<string, { texto: string; clase: string }> = {
  exito: {
    texto: "¡Listo! Estamos confirmando tu pago con Mercado Pago -- puede tardar unos segundos en reflejarse acá.",
    clase: "bg-emerald-50 text-emerald-800",
  },
  pendiente: {
    texto: "Tu pago quedó pendiente de confirmación en Mercado Pago.",
    clase: "bg-amber-50 text-amber-800",
  },
  fallo: {
    texto: "El pago no se pudo completar. Podés intentarlo de nuevo.",
    clase: "bg-red-50 text-red-800",
  },
};

export default async function CuotaPage({
  searchParams,
}: {
  searchParams: Promise<{ pago?: string }>;
}) {
  const { pago } = await searchParams;
  const cuotas = await listarEstadoCuotaAlumno();
  const banner = pago ? BANNER[pago] : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Mi cuota</h1>
        <p className="text-slate-500">Estado por sede, con pago online vía Mercado Pago.</p>
      </div>

      {banner && <p className={`rounded-lg p-3 text-sm ${banner.clase}`}>{banner.texto}</p>}

      {cuotas.length === 0 && (
        <p className="text-sm text-slate-400">
          Todavía no tenés inscripciones, así que no hay cuota que mostrar.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {cuotas.map((c) => {
          const label = ESTADO_LABEL[c.estado];
          const puedePagar = c.estado !== "al_dia";
          return (
            <div
              key={c.sedeId}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{c.sedeNombre}</p>
                {c.vencimiento ? (
                  <p className="text-sm text-slate-500">
                    {c.frecuenciaSemanal}x/semana -- ${c.monto?.toLocaleString("es-AR")} -- vence el{" "}
                    {new Date(c.vencimiento + "T00:00:00").toLocaleDateString("es-AR")}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">Todavía no registramos ningún pago acá.</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${label.clase}`}>
                  {label.texto}
                </span>
                {puedePagar && <PagarButton sedeId={c.sedeId} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
