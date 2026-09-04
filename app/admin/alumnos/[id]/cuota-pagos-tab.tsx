"use client";

import { useState, useTransition } from "react";
import { aprobarPagoEfectivo, registrarPagoEfectivo, aprobarComprobante, rechazarComprobante } from "@/lib/admin/pagos-actions";
import type { AlumnoCuotaItem, AlumnoPagoItem } from "@/lib/admin/alumnos-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";

const CUOTA_VARIANT: Record<string, { texto: string; variant: "success" | "warning" | "error" | "neutral" }> = {
  al_dia: { texto: "Al día", variant: "success" },
  por_vencer: { texto: "Por vencer", variant: "warning" },
  vencida: { texto: "Vencida", variant: "error" },
  sin_pagos: { texto: "Sin pagos registrados", variant: "neutral" },
};

const ESTADO_VARIANT: Record<string, { texto: string; variant: "success" | "warning" | "error" | "neutral" }> = {
  aprobado: { texto: "Aprobado", variant: "success" },
  pendiente: { texto: "Pendiente de revisión", variant: "warning" },
  procesando: { texto: "Procesando", variant: "warning" },
  rechazado: { texto: "Rechazado", variant: "error" },
};

const MEDIO_LABEL: Record<string, string> = { mercadopago: "Mercado Pago", efectivo: "Efectivo", transferencia: "Transferencia" };

function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR");
}

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

// Todo lo económico del alumno, en un solo lugar (antes repartido entre
// "Cuota por sede", "Pagos" y "Comprobantes subidos", tres secciones que
// mostraban en parte los mismos pagos). No cambia ninguna regla de cobro,
// descuento, prorrateo ni tolerancia -- solo reorganiza cómo se ve y
// reutiliza exactamente las mismas acciones que ya existían.
export function CuotaPagosTab({
  alumnoId,
  cuotas,
  pagos,
}: {
  alumnoId: string;
  cuotas: AlumnoCuotaItem[];
  pagos: AlumnoPagoItem[];
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [sedeId, setSedeId] = useState(cuotas[0]?.sedeId ?? "");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const registrarEfectivo = () => {
    if (!sedeId) return;
    setPendingId(null);
    startTransition(async () => {
      const result = await registrarPagoEfectivo(alumnoId, sedeId);
      setMsg(result.message);
    });
  };

  const aprobarGenerico = (pagoId: string) => {
    setPendingId(pagoId);
    startTransition(async () => {
      const result = await aprobarPagoEfectivo(pagoId, alumnoId);
      setMsg(result.message);
      setPendingId(null);
    });
  };

  const aprobarConComprobante = (pagoId: string) => {
    setPendingId(pagoId);
    startTransition(async () => {
      const result = await aprobarComprobante(pagoId);
      setMsg(result.message);
      setPendingId(null);
    });
  };

  const rechazar = (pagoId: string) => {
    setPendingId(pagoId);
    startTransition(async () => {
      const result = await rechazarComprobante(pagoId);
      setMsg(result.message);
      setPendingId(null);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Cuota actual</h2>
        {cuotas.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin inscripciones vigentes en ninguna sede.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {cuotas.map((c) => {
              const label = CUOTA_VARIANT[c.estado];
              return (
                <div key={c.sedeId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900">{c.sedeNombre}</p>
                    {c.monto != null && (
                      <p className="text-xs text-neutral-500">
                        ${c.monto.toLocaleString("es-AR")}
                        {c.vencimiento && ` · vence ${formatearFecha(c.vencimiento)}`}
                        {c.medio && ` · pagado con ${MEDIO_LABEL[c.medio]}`}
                      </p>
                    )}
                  </div>
                  <Badge variant={label.variant}>{label.texto}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {cuotas.length > 0 && (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Field label="Registrar pago en efectivo" className="min-w-0 flex-1">
            <Select value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
              {cuotas.map((c) => (
                <option key={c.sedeId} value={c.sedeId}>
                  {c.sedeNombre}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="button" onClick={registrarEfectivo} loading={pending && pendingId === null} className="sm:self-end">
            Registrar y aprobar
          </Button>
        </Card>
      )}

      {msg && <p className="text-sm text-neutral-500">{msg}</p>}

      <Card padded={false} className="overflow-x-auto">
        <h2 className="p-4 pb-3 font-semibold text-neutral-900">Historial de pagos</h2>
        {pagos.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-neutral-400">Todavía no hay pagos registrados.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Fecha</th>
                <th className="px-4 py-2.5 font-medium">Actividad/Concepto</th>
                <th className="px-4 py-2.5 font-medium">Monto</th>
                <th className="px-4 py-2.5 font-medium">Método</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5 font-medium">Registrado por</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {pagos.map((p) => {
                const estado = ESTADO_VARIANT[p.estado];
                const estaOcupado = pending && pendingId === p.id;
                return (
                  <tr key={p.id} className="border-t border-neutral-100">
                    <td className="px-4 py-2.5 whitespace-nowrap text-neutral-600">{formatearFechaHora(p.createdAt)}</td>
                    <td className="px-4 py-2.5 font-medium text-neutral-900">{p.conceptoLabel}</td>
                    <td className="px-4 py-2.5 text-neutral-600">${p.monto.toLocaleString("es-AR")}</td>
                    <td className="px-4 py-2.5 text-neutral-600">{MEDIO_LABEL[p.medio]}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={estado.variant}>{estado.texto}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">{p.marcadoPorNombre ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {p.comprobanteUrl && (
                          <a
                            href={`/admin/comprobantes/${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-primary-600 hover:underline"
                          >
                            Ver comprobante
                          </a>
                        )}
                        {p.estado === "pendiente" && p.comprobanteUrl && (
                          <>
                            <Button size="sm" variant="secondary" loading={estaOcupado} onClick={() => aprobarConComprobante(p.id)}>
                              Aprobar
                            </Button>
                            <Button size="sm" variant="destructive" loading={estaOcupado} onClick={() => rechazar(p.id)}>
                              Rechazar
                            </Button>
                          </>
                        )}
                        {(p.estado === "pendiente" || p.estado === "procesando") && !p.comprobanteUrl && (
                          <Button size="sm" variant="secondary" loading={estaOcupado} onClick={() => aprobarGenerico(p.id)}>
                            Aprobar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
