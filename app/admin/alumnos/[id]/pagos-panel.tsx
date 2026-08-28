"use client";

import { useState, useTransition } from "react";
import { aprobarPagoEfectivo, registrarPagoEfectivo } from "@/lib/admin/pagos-actions";
import type { AlumnoCuotaItem, AlumnoPagoItem } from "@/lib/admin/alumnos-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";

const ESTADO_VARIANT: Record<string, { texto: string; variant: "success" | "warning" | "error" | "neutral" }> = {
  aprobado: { texto: "Aprobado", variant: "success" },
  pendiente: { texto: "Pendiente", variant: "warning" },
  procesando: { texto: "Procesando", variant: "warning" },
  rechazado: { texto: "Rechazado", variant: "error" },
};

const MEDIO_LABEL: Record<string, string> = {
  mercadopago: "Mercado Pago",
  efectivo: "Efectivo",
};

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-AR");
}

export function PagosPanel({
  alumnoId,
  pagos,
  sedesConInscripcion,
}: {
  alumnoId: string;
  pagos: AlumnoPagoItem[];
  sedesConInscripcion: AlumnoCuotaItem[];
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [sedeId, setSedeId] = useState(sedesConInscripcion[0]?.sedeId ?? "");

  const aprobar = (pagoId: string) => {
    startTransition(async () => {
      const result = await aprobarPagoEfectivo(pagoId, alumnoId);
      setMsg(result.message);
    });
  };

  const registrarEfectivo = () => {
    if (!sedeId) return;
    startTransition(async () => {
      const result = await registrarPagoEfectivo(alumnoId, sedeId);
      setMsg(result.message);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-semibold text-neutral-900">Pagos</h2>

      {sedesConInscripcion.length > 0 && (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Field label="Registrar pago en efectivo" className="min-w-0 flex-1">
            <Select value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
              {sedesConInscripcion.map((s) => (
                <option key={s.sedeId} value={s.sedeId}>
                  {s.sedeNombre}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="button" onClick={registrarEfectivo} loading={pending} className="sm:self-end">
            Registrar y aprobar
          </Button>
        </Card>
      )}

      {msg && <p className="text-sm text-neutral-500">{msg}</p>}

      {pagos.length === 0 ? (
        <p className="text-sm text-neutral-500">Todavía no hay pagos registrados.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {pagos.map((p) => {
            const estado = ESTADO_VARIANT[p.estado];
            const puedeAprobar = p.estado === "pendiente" || p.estado === "procesando";
            return (
              <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900">
                    {p.sedeNombre} -- ${p.monto.toLocaleString("es-AR")}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {MEDIO_LABEL[p.medio]} -- {formatearFechaHora(p.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={estado.variant}>{estado.texto}</Badge>
                  {puedeAprobar && (
                    <Button type="button" size="sm" variant="secondary" loading={pending} onClick={() => aprobar(p.id)}>
                      Aprobar
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
