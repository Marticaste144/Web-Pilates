import { listarArancelesVigentes } from "@/lib/admin/aranceles-data";
import { ArancelCell } from "./arancel-cell";

export const dynamic = "force-dynamic";

export default async function ArancelesPage() {
  const aranceles = await listarArancelesVigentes();

  const sedes = Array.from(new Map(aranceles.map((a) => [a.sedeId, a.sedeNombre])).entries());
  const frecuencias = [1, 2, 3, 4];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Aranceles</h1>
        <p className="text-slate-500">
          Un cambio no pisa el histórico: queda una fila nueva vigente desde hoy.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Sede</th>
              {frecuencias.map((f) => (
                <th key={f} className="px-4 py-3">
                  {f} {f === 1 ? "vez" : "veces"} / semana
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sedes.map(([sedeId, sedeNombre]) => (
              <tr key={sedeId} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{sedeNombre}</td>
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
                        <span className="text-slate-400">sin definir</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
