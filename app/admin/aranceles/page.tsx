import { listarArancelesPorActividad } from "@/lib/admin/aranceles-data";
import { obtenerConfiguracionPagos } from "@/lib/configuracion-pagos";
import { ArancelActividadCell } from "./arancel-actividad-cell";
import { ConfiguracionPagosForm } from "./configuracion-pagos-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

const FRECUENCIA_LABEL: Record<number, string> = {
  0: "Libre",
  1: "1 vez / semana",
  2: "2 veces / semana",
  3: "3 veces / semana",
  4: "4 veces / semana",
};

// Modelo nuevo: precio por ACTIVIDAD (no por sede) -- una card por
// actividad, con sus frecuencias reales debajo. Las combinaciones de dos
// actividades (ej. Postural + Pilates, aunque estén en sedes distintas) se
// calculan solas con el 20% de descuento en la más cara -- no hay una fila
// de precio para eso, ver lib/cuota-calculo.ts.
export default async function ArancelesPage() {
  const [aranceles, configPagos] = await Promise.all([listarArancelesPorActividad(), obtenerConfiguracionPagos()]);

  const actividades = Array.from(new Map(aranceles.map((a) => [a.actividadId, a.actividadNombre])).entries());
  const hayPendientes = aranceles.some((a) => a.valorMensual === null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Aranceles" subtitle="Precio mensual por actividad -- septiembre 2026." />

      <ConfiguracionPagosForm
        aliasTransferencia={configPagos.aliasTransferencia}
        cbuTransferencia={configPagos.cbuTransferencia}
        titularTransferencia={configPagos.titularTransferencia}
        aliasMercadopago={configPagos.aliasMercadopago}
        diasTolerancia={configPagos.diasTolerancia}
      />

      {hayPendientes && (
        <Alert variant="warning">
          Hay frecuencias todavía sin precio confirmado (4x de Funcional/Fuerza/Stretching/Ritmo) -- cargalas acá
          abajo en cuanto Laura las confirme.
        </Alert>
      )}

      <Alert variant="info">
        Si una alumna combina DOS actividades distintas (en la misma sede o en sedes distintas), el sistema cobra la
        más cara con 20% de descuento y la otra completa -- automático, no hace falta cargar un precio combinado.
        &ldquo;Combinado&rdquo; (mencionado por Laura para 3 o más actividades) es otra cosa, todavía sin definir --
        no se automatiza hasta que confirme qué significa y cuánto sale.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actividades.map(([actividadId, actividadNombre]) => (
          <Card key={actividadId}>
            <h2 className="mb-3 font-semibold text-neutral-900">{actividadNombre}</h2>
            <div className="flex flex-col gap-3">
              {aranceles
                .filter((a) => a.actividadId === actividadId)
                .map((a) => (
                  <div
                    key={a.clasesPorSemana}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3 first:border-t-0 first:pt-0"
                  >
                    <span className="shrink-0 text-sm text-neutral-600">{FRECUENCIA_LABEL[a.clasesPorSemana]}</span>
                    <ArancelActividadCell actividadId={actividadId} clasesPorSemana={a.clasesPorSemana} valorMensual={a.valorMensual} />
                  </div>
                ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
