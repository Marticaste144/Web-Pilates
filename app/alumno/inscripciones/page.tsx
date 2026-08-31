import { listarMisInscripciones } from "@/lib/alumno/inscripciones-data";
import { SedeIcon } from "@/components/alumno/sede-icon";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { BajaButton } from "./baja-button";
import { ConfirmarAsistenciaButton } from "./confirmar-asistencia-button";
import { LiberarTurnoButton } from "./liberar-turno-button";
import { FeedbackForm } from "./feedback-form";
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
    <div className="flex flex-col gap-4 py-4 sm:gap-5 sm:py-5">
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
          return (
            <Card key={i.id} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary-50 text-secondary-600">
                    <SedeIcon nombre={i.sedeNombre} className="h-5 w-5" />
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
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {i.estado === "activa" && i.esHoy && i.fechaHoy && (
                    i.yaConfirmoHoy ? (
                      <span className="text-sm font-medium text-success-700">Asistencia confirmada ✓</span>
                    ) : i.ventanaConfirmacionAbierta ? (
                      <ConfirmarAsistenciaButton claseId={i.claseId} fecha={i.fechaHoy} />
                    ) : (
                      <span className="text-xs text-neutral-400">
                        Podés confirmar 1hs antes ({i.horaInicio.slice(0, 5)})
                      </span>
                    )
                  )}
                  {i.estado === "activa" &&
                    i.esHoy &&
                    !i.yaConfirmoHoy &&
                    (i.puedeLiberarHoy || i.turnoLiberadoHoyId) && (
                      <LiberarTurnoButton
                        claseId={i.claseId}
                        fecha={i.fechaHoy ?? ""}
                        turnoLiberadoId={i.turnoLiberadoHoyId}
                      />
                    )}
                  <BajaButton inscripcionId={i.id} />
                </div>
              </div>

              {i.estado === "activa" && (
                <div className="flex justify-end border-t border-neutral-100 pt-3">
                  <FeedbackForm claseId={i.claseId} fecha={i.fechaUltimaClase} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
