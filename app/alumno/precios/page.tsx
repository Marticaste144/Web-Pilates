import { listarArancelesPorActividad } from "@/lib/admin/aranceles-data";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const FRECUENCIA_LABEL: Record<number, string> = {
  1: "1 vez por semana",
  2: "2 veces por semana",
  3: "3 veces por semana",
  4: "4 veces por semana",
  0: "Libre",
};

function ordenFrecuencia(clasesPorSemana: number): number {
  // "Libre" (0) siempre al final, el resto en orden creciente.
  return clasesPorSemana === 0 ? 99 : clasesPorSemana;
}

// Misma fuente que Admin -> Aranceles (listarArancelesPorActividad): si
// Laura cambia un precio ahí, se ve acá solo -- nunca un valor propio de
// esta pantalla. Se filtran a propósito las combinaciones sin precio
// configurado todavía (valorMensual null) -- nunca se inventa un número, y
// una actividad que todavía no tiene NINGÚN precio cargado directamente no
// aparece (mostrar el título sin ninguna fila abajo sería confuso).
export default async function PreciosPage() {
  const aranceles = await listarArancelesPorActividad();
  const conPrecio = aranceles.filter((a) => a.valorMensual !== null);

  const porActividad = new Map<string, { nombre: string; items: typeof conPrecio }>();
  for (const item of conPrecio) {
    const grupo = porActividad.get(item.actividadId) ?? { nombre: item.actividadNombre, items: [] };
    grupo.items.push(item);
    porActividad.set(item.actividadId, grupo);
  }

  const actividades = [...porActividad.values()]
    .map((g) => ({ ...g, items: g.items.sort((a, b) => ordenFrecuencia(a.clasesPorSemana) - ordenFrecuencia(b.clasesPorSemana)) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <PageHeader title="Precios" subtitle="Valores mensuales vigentes por actividad." />

      {actividades.length === 0 ? (
        <EmptyState title="Todavía no hay precios cargados" description="La administración todavía no configuró ningún arancel." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {actividades.map((actividad) => (
            <Card key={actividad.nombre} padded={false}>
              <h2 className="border-b border-neutral-100 p-4 pb-3 font-semibold uppercase tracking-wide text-neutral-900">
                {actividad.nombre}
              </h2>
              <div className="flex flex-col divide-y divide-neutral-100">
                {actividad.items.map((item) => (
                  <div key={item.clasesPorSemana} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="text-neutral-600">{FRECUENCIA_LABEL[item.clasesPorSemana] ?? `${item.clasesPorSemana}x por semana`}</span>
                    <span className="font-semibold text-neutral-900">
                      ${item.valorMensual!.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-secondary-50">
        <h2 className="font-semibold text-neutral-900">¿Hacés dos actividades?</h2>
        <p className="mt-1 text-sm text-neutral-700">
          Tenés un <span className="font-semibold">20% de descuento</span> en la actividad de mayor valor. La otra se
          paga completa.
        </p>
      </Card>
    </div>
  );
}
