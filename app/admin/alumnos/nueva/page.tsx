import Link from "next/link";
import { NuevaAlumnaForm } from "./nueva-alumna-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default function NuevaAlumnaPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/admin/alumnos" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline">
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver
        </Link>
        <PageHeader
          title="Agregar alumno"
          subtitle="Para un alumno presencial que todavía no usa (o no quiere usar) la web -- podés darle acceso más adelante cuando corresponda."
        />
      </div>

      <Card className="max-w-xl">
        <NuevaAlumnaForm />
      </Card>
    </div>
  );
}
