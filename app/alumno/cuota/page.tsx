import { listarEstadoCuotaAlumno } from "@/lib/alumno/cuota-data";

export const dynamic = "force-dynamic";

const ESTADO_LABEL: Record<string, { texto: string; clase: string }> = {
  al_dia: { texto: "Al día", clase: "bg-emerald-100 text-emerald-700" },
  por_vencer: { texto: "Por vencer", clase: "bg-amber-100 text-amber-700" },
  vencida: { texto: "Vencida", clase: "bg-red-100 text-red-700" },
  sin_pagos: { texto: "Sin pagos registrados", clase: "bg-slate-100 text-slate-600" },
};

export default async function CuotaPage() {
  const cuotas = await listarEstadoCuotaAlumno();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Mi cuota</h1>
        <p className="text-slate-500">
          El pago online (Mercado Pago) todavía no está disponible en esta etapa del proyecto.
        </p>
      </div>

      {cuotas.length === 0 && (
        <p className="text-sm text-slate-400">
          Todavía no tenés inscripciones, así que no hay cuota que mostrar.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {cuotas.map((c) => {
          const label = ESTADO_LABEL[c.estado];
          return (
            <div
              key={c.sedeId}
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
            >
              <div>
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
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${label.clase}`}>
                {label.texto}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
