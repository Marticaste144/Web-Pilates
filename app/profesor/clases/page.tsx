import Link from "next/link";
import { listarMisClases } from "@/lib/profesor/clases-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { DescargarAsistenciasPdf } from "./descargar-asistencias-pdf";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function MisClasesPage() {
  const clases = await listarMisClases();
  const diaLabel = (dia: number) => DIAS_SEMANA.find((d) => d.value === dia)?.label ?? dia;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader title="Mis clases" subtitle="Entrá a una clase para ver alumnos y tomar asistencia." />

      {clases.length > 0 && <DescargarAsistenciasPdf />}

      {clases.length === 0 && (
        <EmptyState
          title="Todavía no tenés clases asignadas"
          description="Cuando la administración te asigne una clase, la vas a ver acá."
        />
      )}

      <div className="flex flex-col gap-2.5">
        {clases.map((c) => (
          <Link key={c.id} href={`/profesor/clases/${c.id}`} className="group">
            <Card className="flex items-center justify-between gap-4 transition-colors group-hover:border-primary-400">
              <div className="min-w-0">
                <p className="font-medium text-neutral-900">{c.sedeNombre}</p>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {diaLabel(c.diaSemana)} {c.horaInicio.slice(0, 5)} - {c.horaFin.slice(0, 5)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="neutral">
                  {c.inscriptosActivos}/{c.cupo} lugares
                </Badge>
                <ChevronRightIcon className="h-4 w-4 text-neutral-300 group-hover:text-primary-500" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
