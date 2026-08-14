import Link from "next/link";
import { listarComprobantesPendientes } from "@/lib/admin/comprobantes-data";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AprobarComprobanteButton } from "../alumnos/[id]/aprobar-comprobante-button";
import { RechazarComprobanteButton } from "../alumnos/[id]/rechazar-comprobante-button";

export const dynamic = "force-dynamic";

const MEDIO_TEXTO: Record<string, string> = {
  mercadopago: "Mercado Pago",
  efectivo: "efectivo",
  transferencia: "transferencia",
};

function formatearFechaHora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

// Vista global de todos los comprobantes pendientes, de cualquier alumno --
// antes la única forma de encontrarlos era entrar alumno por alumno a
// /admin/alumnos/[id]. Reusa los mismos botones de aprobar/rechazar que ya
// existían ahí (misma Server Action, mismo resultado).
export default async function ComprobantesPage() {
  const comprobantes = await listarComprobantesPendientes();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Comprobantes pendientes"
        subtitle="Transferencias con comprobante subido, esperando revisión."
      />

      {comprobantes.length === 0 ? (
        <EmptyState title="No hay comprobantes pendientes" description="Todo lo que se subió ya fue revisado." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {comprobantes.map((c) => (
            <Card key={c.pagoId} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-neutral-900">
                  <Link href={`/admin/alumnos/${c.alumnoId}`} className="hover:underline">
                    {c.alumnoNombre}
                  </Link>
                  {" -- "}
                  {c.sedeNombre} -- ${c.monto.toLocaleString("es-AR")}
                </p>
                <p className="text-sm text-neutral-500">
                  {MEDIO_TEXTO[c.medio] ?? c.medio} -- subido el {formatearFechaHora(c.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <a
                  href={`/admin/comprobantes/${c.pagoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary-600 hover:underline"
                >
                  Ver comprobante
                </a>
                <AprobarComprobanteButton pagoId={c.pagoId} />
                <RechazarComprobanteButton pagoId={c.pagoId} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
