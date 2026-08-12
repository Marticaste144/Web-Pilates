import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { CalendarIcon, ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default function ProfesorHomePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Hola 👋"
        subtitle="Un alumno inscripto recién aparece en tu roster cuando tiene su primera cuota aprobada en esa sede -- hasta entonces cuenta para el cupo pero no ves sus datos."
      />
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
