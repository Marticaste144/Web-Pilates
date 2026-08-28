import { listarEstadoCuotaAlumno } from "@/lib/alumno/cuota-data";
import { obtenerConfiguracionPagos } from "@/lib/configuracion-pagos";
import { CuotaPanel } from "./cuota-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

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
  const [cuotas, configPagos] = await Promise.all([listarEstadoCuotaAlumno(), obtenerConfiguracionPagos()]);
  const banner = pago ? BANNER[pago] : null;

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <PageHeader title="Mi cuota" />

      {banner && <Alert variant={banner.variant}>{banner.texto}</Alert>}

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
