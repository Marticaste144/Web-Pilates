import { listarEstadoCuotaAlumno } from "@/lib/alumno/cuota-data";
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
      <PageHeader title="Mi cuota" subtitle="Estado por sede, con pago online vía Mercado Pago." />

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
                  {puedePagar && <PagarButton sedeId={c.sedeId} />}
                </div>
              </div>
              {puedePagar && (
                <div className="border-t border-neutral-100 pt-3">
                  <p className="mb-1.5 text-xs text-neutral-500">
                    ¿Pagaste en efectivo o por fuera del sistema? Subí el comprobante como respaldo -- la
                    administración lo revisa y confirma la cuota.
                  </p>
                  <SubirComprobanteForm sedeId={c.sedeId} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
