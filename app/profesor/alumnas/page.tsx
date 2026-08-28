import { listarMisAlumnas } from "@/lib/profesor/alumnas-data";
import { AlumnasTable } from "./alumnas-table";

export const dynamic = "force-dynamic";

export default async function AlumnasPage() {
  const { alumnas, sedes } = await listarMisAlumnas();

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">Mis alumnas</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {alumnas.length === 0
            ? "Todavía no tenés alumnas asignadas."
            : `${alumnas.length} alumna${alumnas.length === 1 ? "" : "s"} en tus clases.`}
        </p>
      </div>

      <AlumnasTable alumnas={alumnas} sedes={sedes} />
    </div>
  );
}
