"use client";

import { useState } from "react";
import { SubirComprobanteForm } from "./subir-comprobante-form";
import { SedeIcon } from "@/components/alumno/sede-icon";
import type { CuotaSedeItem } from "@/lib/alumno/cuota-data";
import type { ConfiguracionPagos } from "@/lib/configuracion-pagos";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

const ESTADO_LABEL: Record<string, { texto: string; variant: "success" | "warning" | "error" | "neutral" }> = {
  al_dia: { texto: "Al día", variant: "success" },
  por_vencer: { texto: "Por vencer", variant: "warning" },
  vencida: { texto: "Vencida", variant: "error" },
  sin_pagos: { texto: "Sin pagos registrados", variant: "neutral" },
};

function formatearFechaHora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

// Layout de dos columnas (resumen de sedes a la izquierda, detalle de la
// sede elegida a la derecha) -- selección puramente visual en el cliente,
// no toca ninguna query ni acción: SubirComprobanteForm es la misma de
// siempre, solo se renderiza según `selected`.
//
// Sin pago automático: el único camino es transferir por fuera de la app
// (a cualquiera de los destinos de abajo) y subir el comprobante -- la
// admin lo revisa y confirma o rechaza desde /admin/comprobantes.
export function CuotaPanel({ cuotas, configPagos }: { cuotas: CuotaSedeItem[]; configPagos: ConfiguracionPagos }) {
  const [selected, setSelected] = useState(
    () => cuotas.find((c) => c.estado !== "al_dia")?.sedeId ?? cuotas[0]?.sedeId ?? "",
  );

  const activa = cuotas.find((c) => c.sedeId === selected) ?? cuotas[0];
  if (!activa) return null;

  const tieneDatosTransferencia = Boolean(
    configPagos.aliasTransferencia || configPagos.cbuTransferencia || configPagos.aliasMercadopago,
  );
  const label = ESTADO_LABEL[activa.estado];
  const puedePagar = activa.estado !== "al_dia";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr] lg:items-start">
      <div className="flex flex-col gap-2.5 lg:gap-3">
        {cuotas.map((c) => {
          const l = ESTADO_LABEL[c.estado];
          const activo = c.sedeId === selected;
          return (
            <button
              key={c.sedeId}
              type="button"
              onClick={() => setSelected(c.sedeId)}
              className={`flex flex-col gap-2.5 rounded-card border p-4 text-left shadow-sm transition-colors ${
                activo ? "border-primary-400 bg-primary-50" : "border-neutral-200 bg-white hover:border-primary-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary-50 text-secondary-600">
                  <SedeIcon nombre={c.sedeNombre} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold uppercase tracking-wide text-neutral-900">{c.sedeNombre}</p>
                  {c.vencimiento && (
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {c.frecuenciaSemanal}x/semana -- vence el{" "}
                      {new Date(c.vencimiento + "T00:00:00").toLocaleDateString("es-AR")}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={l.variant}>{l.texto}</Badge>
            </button>
          );
        })}
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold uppercase tracking-wide text-neutral-900">{activa.sedeNombre}</p>
            {activa.vencimiento ? (
              <p className="text-sm text-neutral-500">
                {activa.frecuenciaSemanal}x/semana -- ${activa.monto?.toLocaleString("es-AR")} -- vence el{" "}
                {new Date(activa.vencimiento + "T00:00:00").toLocaleDateString("es-AR")}
              </p>
            ) : (
              <p className="text-sm text-neutral-500">Todavía no registramos ningún pago acá.</p>
            )}
          </div>
          <Badge variant={label.variant}>{label.texto}</Badge>
        </div>

        {activa.transferenciaPendiente && (
          <Alert variant="warning">
            Ya subiste un comprobante por ${activa.transferenciaPendiente.monto.toLocaleString("es-AR")} el{" "}
            {formatearFechaHora(activa.transferenciaPendiente.createdAt)} -- pendiente de verificación por la
            administración. Todavía no hace falta que subas otro.
          </Alert>
        )}

        {!activa.transferenciaPendiente && activa.ultimoRechazo && (
          <Alert variant="error">
            Tu comprobante por ${activa.ultimoRechazo.monto.toLocaleString("es-AR")} del{" "}
            {formatearFechaHora(activa.ultimoRechazo.createdAt)} fue rechazado. Revisá el monto/destino y subí un
            comprobante nuevo -- si no estás segura de por qué se rechazó, contactá directamente a la administración
            de MUV antes de volver a transferir.
          </Alert>
        )}

        {puedePagar &&
          !activa.transferenciaPendiente &&
          (activa.precioActual === null ? (
            <p className="border-t border-neutral-100 pt-3 text-sm text-error-600">
              {activa.faltaClasificarActividad
                ? "Todavía falta clasificar la actividad de alguna de tus clases en esta sede -- contactá a la administración."
                : "No hay un arancel definido para tu frecuencia en esta sede todavía -- contactá a la administración."}
            </p>
          ) : (
            <div className="flex flex-col gap-3 border-t border-neutral-100 pt-3">
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-sm font-medium text-neutral-900">
                  Transferir: ${activa.precioActual.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                </p>
                {activa.esProrateado && (
                  <p className="mt-1 text-xs text-secondary-600">
                    Primera cuota prorrateada: te quedan {activa.clasesRestantes} de {activa.clasesDelMes} clases
                    este mes. Desde el mes que viene pagás el mes completo, entre el 1 y el 10.
                  </p>
                )}
                {tieneDatosTransferencia ? (
                  <div className="mt-1.5 flex flex-col gap-0.5 text-xs text-neutral-600">
                    {configPagos.titularTransferencia && (
                      <p>
                        Titular:{" "}
                        <span className="font-medium text-neutral-800">{configPagos.titularTransferencia}</span>
                      </p>
                    )}
                    {configPagos.aliasTransferencia && (
                      <p>
                        Cuenta DNI / Alias:{" "}
                        <span className="font-medium text-neutral-800">{configPagos.aliasTransferencia}</span>
                      </p>
                    )}
                    {configPagos.cbuTransferencia && (
                      <p>
                        CBU: <span className="font-medium text-neutral-800">{configPagos.cbuTransferencia}</span>
                      </p>
                    )}
                    {configPagos.aliasMercadopago && (
                      <p>
                        Mercado Pago / Alias:{" "}
                        <span className="font-medium text-neutral-800">{configPagos.aliasMercadopago}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-neutral-400">
                    La administración todavía no cargó los datos de transferencia.
                  </p>
                )}
                <p className="mt-2 text-xs text-neutral-500">
                  Después de transferir, subí el comprobante acá abajo -- es obligatorio: la cuota queda pendiente de
                  verificación hasta que la administración lo revise.
                </p>
                <div className="mt-2">
                  <SubirComprobanteForm sedeId={activa.sedeId} />
                </div>
              </div>
            </div>
          ))}
      </Card>
    </div>
  );
}
