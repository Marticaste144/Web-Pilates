"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { actualizarMetadataPlanificacion, crearNuevaVersion } from "@/lib/planificaciones-actions";
import type { PlanificacionResumen } from "@/lib/planificaciones-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

// Encabezado de la planificación: título/objetivo/observaciones (editables
// solo si es la actual), quién la creó, y las acciones de versión ("Nueva
// versión" + link al historial). `historialHref` es null cuando no aplica
// (ej. mientras se está viendo directamente una versión histórica -- ahí el
// botón "Volver al historial" ya cumple ese rol desde la página).
export function MetadataPanel({
  plan,
  readOnly,
  historialHref,
}: {
  plan: PlanificacionResumen;
  readOnly: boolean;
  historialHref: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mostrarNuevaVersion, setMostrarNuevaVersion] = useState(false);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-900">{plan.titulo || `Versión ${plan.version}`}</h2>
            {!plan.esActual && <Badge variant="warning">Histórica -- solo lectura</Badge>}
            {plan.esActual && <Badge variant="success">Actual</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            Profesor: {plan.creadoPorNombre} · Creada el {formatearFecha(plan.createdAt)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {historialHref && (
            <Link href={historialHref} className="text-sm font-medium text-primary-600 hover:underline">
              Ver historial
            </Link>
          )}
          {!readOnly && plan.esActual && (
            <Button type="button" size="sm" variant="secondary" onClick={() => setMostrarNuevaVersion((v) => !v)}>
              Nueva versión
            </Button>
          )}
        </div>
      </div>

      {mostrarNuevaVersion && <NuevaVersionForm planificacionId={plan.id} onCerrar={() => setMostrarNuevaVersion(false)} />}

      {readOnly ? (
        <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3 text-sm text-neutral-700">
          {plan.objetivoGeneral && (
            <p>
              <span className="font-medium text-neutral-900">Objetivo general: </span>
              {plan.objetivoGeneral}
            </p>
          )}
          {plan.observaciones && (
            <p>
              <span className="font-medium text-neutral-900">Observaciones: </span>
              {plan.observaciones}
            </p>
          )}
        </div>
      ) : (
        <form
          className="flex flex-col gap-3 border-t border-neutral-100 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            setMensaje(null);
            startTransition(async () => {
              const r = await actualizarMetadataPlanificacion(plan.id, formData);
              setMensaje(r.message);
            });
          }}
        >
          <Field label="Título">
            <Input name="titulo" defaultValue={plan.titulo ?? ""} placeholder="Ej. Septiembre 2026" />
          </Field>
          <Field label="Objetivo general">
            <Textarea name="objetivo_general" rows={2} defaultValue={plan.objetivoGeneral ?? ""} />
          </Field>
          <Field label="Observaciones">
            <Textarea name="observaciones" rows={2} defaultValue={plan.observaciones ?? ""} />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" loading={pending} className="self-start">
              Guardar datos
            </Button>
            {mensaje && <p className="text-xs text-neutral-500">{mensaje}</p>}
          </div>
        </form>
      )}
    </Card>
  );
}

function NuevaVersionForm({ planificacionId, onCerrar }: { planificacionId: string; onCerrar: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function crear(copiar: boolean, formData: FormData) {
    setError(null);
    startTransition(async () => {
      const r = await crearNuevaVersion(planificacionId, copiar, formData);
      if (!r.ok) setError(r.message);
      else onCerrar();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-neutral-50 p-3">
      <p className="text-sm text-neutral-600">
        La versión actual queda archivada en el historial, de solo lectura, tal como está ahora.
      </p>
      <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título de la nueva versión" hint="Ej. Octubre 2026">
            <Input name="titulo" placeholder="Octubre 2026" />
          </Field>
        </div>
        {error && <p className="text-sm text-error-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            loading={pending}
            onClick={(e) => {
              const formData = new FormData(e.currentTarget.closest("form") as HTMLFormElement);
              crear(true, formData);
            }}
          >
            Nueva versión basada en la actual
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={pending}
            onClick={(e) => {
              const formData = new FormData(e.currentTarget.closest("form") as HTMLFormElement);
              crear(false, formData);
            }}
          >
            Nueva planificación desde cero
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCerrar}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
