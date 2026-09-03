import Link from "next/link";
import { listarSedes, listarActividadesPorSede } from "@/lib/admin/clases-data";
import { crearMiClase } from "@/lib/profesor/clases-actions";
import { HorarioForm } from "@/components/clases/horario-form";
import { Card } from "@/components/ui/card";
import { ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function NuevoHorarioPage() {
  const [sedes, actividadesPorSede] = await Promise.all([listarSedes(), listarActividadesPorSede()]);

  return (
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
      <div>
        <Link href="/profesor/clases" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline">
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver a mis clases
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">Nuevo horario</h1>
        <p className="mt-1 text-sm text-neutral-500">Se crea a tu nombre -- después lo podés editar o desactivar desde su detalle.</p>
      </div>

      <Card>
        <HorarioForm action={crearMiClase} sedes={sedes} actividadesPorSede={actividadesPorSede} submitLabel="Crear horario" />
      </Card>
    </div>
  );
}
