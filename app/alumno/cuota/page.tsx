import { listarEstadoCuotaAlumno } from "@/lib/alumno/cuota-data";
import { obtenerConfiguracionPagos } from "@/lib/configuracion-pagos";
import { CuotaPanel } from "./cuota-panel";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function CuotaPage() {
  const [cuotas, configPagos] = await Promise.all([listarEstadoCuotaAlumno(), obtenerConfiguracionPagos()]);

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <PageHeader title="Mi cuota" />

      {cuotas.length === 0 ? (
        <EmptyState
          title="Todavía no tenés inscripciones"
          description="Anotate a una clase para ver el estado de tu cuota acá."
        />
      ) : (
        <CuotaPanel cuotas={cuotas} configPagos={configPagos} />
      )}
    </div>
  );
}
