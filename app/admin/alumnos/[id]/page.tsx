import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenerAlumno } from "@/lib/admin/alumnos-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const CUOTA_VARIANT: Record<string, { texto: string; variant: "success" | "warning" | "error" | "neutral" }> = {
  al_dia: { texto: "Al día", variant: "success" },
  por_vencer: { texto: "Por vencer", variant: "warning" },
  vencida: { texto: "Vencida", variant: "error" },
  sin_pagos: { texto: "Sin pagos registrados", variant: "neutral" },
};

function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR");
}

export default async function AlumnoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const alumno = await obtenerAlumno(id);

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
                      </p>
                    )}
                  </div>
                  <Badge variant={label.variant}>{label.texto}</Badge>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
