import Link from "next/link";
import { obtenerMetricasProfesor } from "@/lib/profesor/dashboard-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { CalendarIcon, ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

function diaLabel(dia: number): string {
  return DIAS_SEMANA.find((d) => d.value === dia)?.label ?? String(dia);
}

export default async function ProfesorHomePage() {
  const m = await obtenerMetricasProfesor();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Hola 👋" />

      <Card className="flex flex-col gap-1">
        <p className="text-xs font-medium text-neutral-500">Próxima clase</p>
        {m.proximaClase ? (
          <p className="text-xl font-bold text-neutral-900">
            {diaLabel(m.proximaClase.diaSemana)} {m.proximaClase.horaInicio.slice(0, 5)} -{" "}
            {m.proximaClase.horaFin.slice(0, 5)}
            <span className="ml-2 text-base font-medium text-neutral-500">{m.proximaClase.sedeNombre}</span>
          </p>
        ) : (
          <p className="text-sm text-neutral-500">Todavía no tenés clases asignadas.</p>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Clases a cargo" value={m.clasesTotal} />
        <StatCard label="Alumnos únicos" value={m.alumnosUnicosTotal} />
        <StatCard label="Ocupación promedio" value={`${m.ocupacionPromedio}%`} />
      </div>

      <Link href="/profesor/clases" className="group w-fit sm:w-64">
        <Card className="flex items-center gap-3 transition-colors group-hover:border-primary-400">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-neutral-900">Mis clases</h2>
            <p className="mt-0.5 text-sm text-neutral-500">Ver alumnos y tomar asistencia.</p>
          </div>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-neutral-300 group-hover:text-primary-500" />
        </Card>
      </Link>
    </div>
  );
}
