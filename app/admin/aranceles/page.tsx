import { listarArancelesVigentes } from "@/lib/admin/aranceles-data";
import { ArancelCell } from "./arancel-cell";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ArancelesPage() {
  const aranceles = await listarArancelesVigentes();

  const sedes = Array.from(new Map(aranceles.map((a) => [a.sedeId, a.sedeNombre])).entries());
  const frecuencias = [1, 2, 3, 4];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Aranceles"
        subtitle="Un cambio no pisa el histórico: queda una fila nueva vigente desde hoy."
      />

      <Card padded={false} className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Sede</th>
              {frecuencias.map((f) => (
                <th key={f} className="px-4 py-3 font-medium">
                  {f} {f === 1 ? "vez" : "veces"} / semana
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sedes.map(([sedeId, sedeNombre]) => (
              <tr key={sedeId} className="border-t border-neutral-100">
                <td className="px-4 py-3 font-medium text-neutral-900">{sedeNombre}</td>
                {frecuencias.map((f) => {
                  const item = aranceles.find((a) => a.sedeId === sedeId && a.clasesPorSemana === f);
                  return (
                    <td key={f} className="px-4 py-3">
                      {item ? (
                        <ArancelCell
                          sedeId={sedeId}
                          clasesPorSemana={f}
                          valorMensual={item.valorMensual}
                        />
                      ) : (
                        <span className="text-neutral-400">sin definir</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
