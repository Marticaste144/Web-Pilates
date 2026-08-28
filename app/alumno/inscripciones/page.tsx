import { listarMisInscripciones } from "@/lib/alumno/inscripciones-data";
import { iconoPorSede } from "@/components/alumno/sede-icon";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { BajaButton } from "./baja-button";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function MisInscripcionesPage() {
  const inscripciones = await listarMisInscripciones();
  const diaLabel = (dia: number) => DIAS_SEMANA.find((d) => d.value === dia)?.label ?? dia;

  return (
    <div className="flex flex-col gap-6 py-6">
      <PageHeader title="Mis clases" subtitle="Tus clases activas y las que estás esperando un lugar." />

      {inscripciones.length === 0 && (
        <EmptyState
          title="Todavía no te anotaste a ninguna clase"
          description="Elegí una clase para reservar tu lugar."
          action={<LinkButton href="/alumno/clases">Ver clases</LinkButton>}
        />
      )}

      <div className="flex flex-col gap-2.5">
        {inscripciones.map((i) => {
          const Icon = iconoPorSede(i.sedeNombre);
          return (
            <Card key={i.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary-50 text-secondary-600">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900">
                    {i.sedeNombre} · {diaLabel(i.diaSemana)} {i.horaInicio.slice(0, 5)} - {i.horaFin.slice(0, 5)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                    <span>Prof. {i.profesorNombre}</span>
                    {i.estado === "lista_espera" && (
                      <Badge variant="warning">Lista de espera -- lugar #{i.posicionEspera}</Badge>
                    )}
                    {i.estado === "activa" && <Badge variant="success">Anotado/a</Badge>}
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <BajaButton inscripcionId={i.id} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
