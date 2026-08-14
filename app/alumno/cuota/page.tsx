import { listarEstadoCuotaAlumno } from "@/lib/alumno/cuota-data";
import { obtenerConfiguracionPagos } from "@/lib/configuracion-pagos";
import { calcularRecargoMercadoPago } from "@/lib/recargo-mercadopago";
import { PagarButton } from "./pagar-button";
import { SubirComprobanteForm } from "./subir-comprobante-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const ESTADO_LABEL: Record<string, { texto: string; variant: "success" | "warning" | "error" | "neutral" }> = {
  al_dia: { texto: "Al día", variant: "success" },
  por_vencer: { texto: "Por vencer", variant: "warning" },
  vencida: { texto: "Vencida", variant: "error" },
  sin_pagos: { texto: "Sin pagos registrados", variant: "neutral" },
};

const BANNER: Record<string, { texto: string; variant: "success" | "warning" | "error" }> = {
  exito: {
    texto: "¡Listo! Estamos confirmando tu pago con Mercado Pago -- puede tardar unos segundos en reflejarse acá.",
    variant: "success",
  },
  pendiente: { texto: "Tu pago quedó pendiente de confirmación en Mercado Pago.", variant: "warning" },
  fallo: { texto: "El pago no se pudo completar. Podés intentarlo de nuevo.", variant: "error" },
};

function formatearFechaHora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default async function CuotaPage({
  searchParams,
}: {
  searchParams: Promise<{ pago?: string }>;
}) {
  const { pago } = await searchParams;
  const [cuotas, configPagos] = await Promise.all([listarEstadoCuotaAlumno(), obtenerConfiguracionPagos()]);
  const banner = pago ? BANNER[pago] : null;

  const tieneDatosTransferencia = Boolean(configPagos.aliasTransferencia || configPagos.cbuTransferencia);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mi cuota" />

      {banner && <Alert variant={banner.variant}>{banner.texto}</Alert>}

      {cuotas.length === 0 && (
        <EmptyState
          title="Todavía no tenés inscripciones"
          description="Anotate a una clase para ver el estado de tu cuota acá."
        />
      )}

      <div className="flex flex-col gap-2.5">
        {cuotas.map((c) => {
          const label = ESTADO_LABEL[c.estado];
          const puedePagar = c.estado !== "al_dia";
          const recargo = c.precioActual ? calcularRecargoMercadoPago(c.precioActual, configPagos.recargoMercadopagoPct) : 0;
          const montoConRecargo = (c.precioActual ?? 0) + recargo;

          return (
            <Card key={c.sedeId} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900">{c.sedeNombre}</p>
                  {c.vencimiento ? (
                    <p className="text-sm text-neutral-500">
                      {c.frecuenciaSemanal}x/semana -- ${c.monto?.toLocaleString("es-AR")} -- vence el{" "}
                      {new Date(c.vencimiento + "T00:00:00").toLocaleDateString("es-AR")}
                    </p>
                  ) : (
                    <p className="text-sm text-neutral-500">Todavía no registramos ningún pago acá.</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge variant={label.variant}>{label.texto}</Badge>
                </div>
              </div>

              {c.transferenciaPendiente && (
                <Alert variant="warning">
                  Ya subiste un comprobante por ${c.transferenciaPendiente.monto.toLocaleString("es-AR")} el{" "}
                  {formatearFechaHora(c.transferenciaPendiente.createdAt)} -- está pendiente de que la administración
                  lo revise. Todavía no hace falta que subas otro.
                </Alert>
              )}

              {puedePagar &&
                (c.precioActual === null ? (
                  <p className="border-t border-neutral-100 pt-3 text-sm text-error-600">
                    No hay un arancel definido para tu frecuencia en esta sede todavía -- contactá a la
                    administración.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3 border-t border-neutral-100 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-neutral-600">
                        Pagar con Mercado Pago: <span className="font-medium text-neutral-900">${montoConRecargo.toLocaleString("es-AR")}</span>{" "}
                        <span className="text-xs text-neutral-400">(incluye recargo)</span>
                      </p>
                      <PagarButton sedeId={c.sedeId} montoConRecargo={montoConRecargo} />
                    </div>

                    <div className="rounded-xl bg-neutral-50 p-3">
                      <p className="text-sm font-medium text-neutral-900">
                        Transferir por alias/CBU: ${c.precioActual.toLocaleString("es-AR")}{" "}
                        <span className="text-xs font-normal text-neutral-400">(sin recargo)</span>
                      </p>
                      {tieneDatosTransferencia ? (
                        <div className="mt-1.5 flex flex-col gap-0.5 text-xs text-neutral-600">
                          {configPagos.aliasTransferencia && (
                            <p>
                              Alias: <span className="font-medium text-neutral-800">{configPagos.aliasTransferencia}</span>
                            </p>
                          )}
                          {configPagos.cbuTransferencia && (
                            <p>
                              CBU: <span className="font-medium text-neutral-800">{configPagos.cbuTransferencia}</span>
                            </p>
                          )}
                          {configPagos.titularTransferencia && (
                            <p>
                              Titular: <span className="font-medium text-neutral-800">{configPagos.titularTransferencia}</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1.5 text-xs text-neutral-400">
                          La administración todavía no cargó los datos de transferencia.
                        </p>
                      )}
                      <p className="mt-2 text-xs text-neutral-500">
                        Después de transferir, subí el comprobante acá abajo -- es obligatorio: la cuota queda
                        pendiente de verificación hasta que la administración lo revise.
                      </p>
                      <div className="mt-2">
                        <SubirComprobanteForm sedeId={c.sedeId} />
                      </div>
                    </div>
                  </div>
                ))}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
