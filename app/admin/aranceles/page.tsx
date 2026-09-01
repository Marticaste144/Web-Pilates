import { listarArancelesVigentes } from "@/lib/admin/aranceles-data";
import { obtenerConfiguracionPagos } from "@/lib/configuracion-pagos";
import { ArancelCell } from "./arancel-cell";
import { ConfiguracionPagosForm } from "./configuracion-pagos-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

// Antes era una tabla ancha (sede x 4 frecuencias, cada celda con un
// mini-formulario) dentro del contenedor de contenido de max-w-3xl -- no
// entraba ni en desktop, así que quedaba con scroll horizontal. Un grid de
// una card por sede, con las 4 frecuencias apiladas adentro, evita el
// problema de raíz (nunca es más ancho que el contenedor) en vez de
// pelearse con anchos de columna, y de paso se ve bien tanto en mobile
// como en desktop sin tener que armar dos layouts distintos.
export default async function ArancelesPage() {
  const [aranceles, configPagos] = await Promise.all([listarArancelesVigentes(), obtenerConfiguracionPagos()]);

  const sedes = Array.from(new Map(aranceles.map((a) => [a.sedeId, a.sedeNombre])).entries());
  const frecuencias = [1, 2, 3, 4];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Aranceles" />

      <ConfiguracionPagosForm
        aliasTransferencia={configPagos.aliasTransferencia}
        cbuTransferencia={configPagos.cbuTransferencia}
        titularTransferencia={configPagos.titularTransferencia}
        aliasMercadopago={configPagos.aliasMercadopago}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {sedes.map(([sedeId, sedeNombre]) => (
          <Card key={sedeId}>
            <h2 className="mb-3 font-semibold text-neutral-900">{sedeNombre}</h2>
            <div className="flex flex-col gap-3">
              {frecuencias.map((f) => {
                const item = aranceles.find((a) => a.sedeId === sedeId && a.clasesPorSemana === f);
                return (
                  <div
                    key={f}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3 first:border-t-0 first:pt-0"
                  >
                    <span className="shrink-0 text-sm text-neutral-600">
                      {f} {f === 1 ? "vez" : "veces"} / semana
                    </span>
                    {item ? (
                      <ArancelCell sedeId={sedeId} clasesPorSemana={f} valorMensual={item.valorMensual} />
                    ) : (
                      <span className="text-xs text-neutral-400">sin definir</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
