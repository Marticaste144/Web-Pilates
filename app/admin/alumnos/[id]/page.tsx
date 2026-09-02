import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenerAlumno } from "@/lib/admin/alumnos-data";
import { obtenerFicha, listarNotasEvolucion } from "@/lib/fichas-evaluacion-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { MarcarEfectivoButton } from "./marcar-efectivo-button";
import { AprobarComprobanteButton } from "./aprobar-comprobante-button";
import { RechazarComprobanteButton } from "./rechazar-comprobante-button";
import { FichaForm } from "@/components/fichas-evaluacion/ficha-form";
import { NotasEvolucion } from "@/components/fichas-evaluacion/notas-evolucion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronRightIcon } from "@/components/ui/icons";
import { PagosPanel } from "./pagos-panel";
import type { MedioPago } from "@/types/database";

export const dynamic = "force-dynamic";

const CUOTA_VARIANT: Record<string, { texto: string; variant: "success" | "warning" | "error" | "neutral" }> = {
  al_dia: { texto: "Al día", variant: "success" },
  por_vencer: { texto: "Por vencer", variant: "warning" },
  vencida: { texto: "Vencida", variant: "error" },
  sin_pagos: { texto: "Sin pagos registrados", variant: "neutral" },
};

const COMPROBANTE_VARIANT: Record<string, { texto: string; variant: "success" | "warning" | "error" | "neutral" }> = {
  pendiente: { texto: "Pendiente de revisión", variant: "warning" },
  aprobado: { texto: "Aprobado", variant: "success" },
  rechazado: { texto: "Rechazado", variant: "error" },
  procesando: { texto: "Procesando", variant: "neutral" },
};

const MEDIO_TEXTO: Record<MedioPago, string> = {
  mercadopago: "Mercado Pago",
  efectivo: "efectivo",
  transferencia: "transferencia",
};

// Para columnas date (ej. vencimiento) -- appendear T00:00:00 evita que el
// shift a hora local corra la fecha un día para atrás cerca de medianoche.
function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR");
}

// Para columnas timestamptz (ej. created_at de un comprobante) -- estas ya
// vienen con hora y zona, así que se parsean tal cual.
function formatearFechaHora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default async function AlumnoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [alumno, ficha, notas] = await Promise.all([
    obtenerAlumno(id),
    obtenerFicha(id),
    listarNotasEvolucion(id),
  ]);

  if (!alumno) {
    notFound();
  }

  const diaLabel = (dia: number) => DIAS_SEMANA.find((d) => d.value === dia)?.label ?? dia;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/alumnos"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          Volver
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">
          {alumno.nombre} {alumno.apellido}
        </h1>
        <p className="text-sm text-neutral-500">
          {alumno.email}
          {alumno.telefono ? ` · ${alumno.telefono}` : ""}
        </p>
      </div>

      <LinkButton href={`/admin/alumnos/${alumno.profileId}/planificacion`} variant="secondary" className="self-start">
        Ver planificación
      </LinkButton>

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold text-neutral-900">Cuota por sede</h2>
        {alumno.cuotas.length === 0 ? (
          <EmptyState title="Sin inscripciones" description="Este alumno no tiene clases vigentes en ninguna sede." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {alumno.cuotas.map((c) => {
              const label = CUOTA_VARIANT[c.estado];
              return (
                <Card key={c.sedeId} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900">{c.sedeNombre}</p>
                    {c.vencimiento && (
                      <p className="text-sm text-neutral-500">
                        ${c.monto?.toLocaleString("es-AR")} -- vence el {formatearFecha(c.vencimiento)}
                        {c.medio && ` -- pagado con ${MEDIO_TEXTO[c.medio]}`}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge variant={label.variant}>{label.texto}</Badge>
                    {c.estado !== "al_dia" && <MarcarEfectivoButton alumnoId={alumno.profileId} sedeId={c.sedeId} />}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <PagosPanel alumnoId={alumno.profileId} pagos={alumno.pagos} sedesConInscripcion={alumno.cuotas} />

      {alumno.comprobantes.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold text-neutral-900">Comprobantes subidos</h2>
          <div className="flex flex-col gap-2.5">
            {alumno.comprobantes.map((c) => {
              const label = COMPROBANTE_VARIANT[c.estado];
              return (
                <Card key={c.pagoId} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900">
                      {c.sedeNombre} -- ${c.monto.toLocaleString("es-AR")}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {MEDIO_TEXTO[c.medio]} -- subido el {formatearFechaHora(c.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant={label.variant}>{label.texto}</Badge>
                    <a
                      href={`/admin/comprobantes/${c.pagoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-primary-600 hover:underline"
                    >
                      Ver comprobante
                    </a>
                    {c.estado === "pendiente" && (
                      <>
                        <AprobarComprobanteButton pagoId={c.pagoId} />
                        <RechazarComprobanteButton pagoId={c.pagoId} />
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Ficha de evaluación</h2>
        <FichaForm ficha={ficha} />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Evolución / notas de seguimiento</h2>
        <NotasEvolucion alumnoId={alumno.profileId} notas={notas} />
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold text-neutral-900">Clases</h2>
        {alumno.inscripciones.length === 0 ? (
          <EmptyState title="No está anotado en ninguna clase" />
        ) : (
          <div className="flex flex-col gap-2.5">
            {alumno.inscripciones.map((i) => (
              <Card key={i.inscripcionId} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900">{i.sedeNombre}</p>
                  <p className="text-sm text-neutral-500">
                    {diaLabel(i.diaSemana)} {i.horaInicio.slice(0, 5)} - {i.horaFin.slice(0, 5)}
                  </p>
                </div>
                {i.estado === "activa" ? (
                  <Badge variant="success">Anotado/a</Badge>
                ) : (
                  <Badge variant="warning">Lista de espera -- #{i.posicionEspera}</Badge>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
