import Link from "next/link";
import type { AlumnoInscripcionItem, AlumnoCuotaItem } from "@/lib/admin/alumnos-data";
import type { FichaEvaluacion } from "@/lib/fichas-evaluacion-data";
import { TURNO_LABELS } from "@/lib/fichas-evaluacion-labels";
import { CATEGORIA_EVOLUCION_LABELS } from "@/lib/fichas-evaluacion-labels";
import type { NotaEvolucion } from "@/lib/fichas-evaluacion-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { calcularProximaOcurrencia, fechaProximaOcurrencia } from "@/lib/proxima-ocurrencia";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CUOTA_VARIANT: Record<string, { texto: string; variant: "success" | "warning" | "error" | "neutral" }> = {
  al_dia: { texto: "Al día", variant: "success" },
  por_vencer: { texto: "Por vencer", variant: "warning" },
  vencida: { texto: "Vencida", variant: "error" },
  sin_pagos: { texto: "Sin pagos registrados", variant: "neutral" },
};

const MEDIO_TEXTO: Record<string, string> = { mercadopago: "Mercado Pago", efectivo: "efectivo", transferencia: "transferencia" };

function diaLabel(dia: number): string {
  return DIAS_SEMANA.find((d) => d.value === dia)?.label ?? String(dia);
}

function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

// "Datos principales": solo lo que ya existe -- contacto familiar/días
// posibles vienen de la ficha de admisión y pueden no estar cargados
// todavía (ficha.existe=false), en cuyo caso ese bloque directamente no se
// muestra en vez de aparecer vacío.
export function ResumenTab({
  telefono,
  email,
  inscripciones,
  cuotas,
  ficha,
  ultimaEvolucion,
  alumnoId,
}: {
  telefono: string | null;
  email: string;
  inscripciones: AlumnoInscripcionItem[];
  cuotas: AlumnoCuotaItem[];
  ficha: FichaEvaluacion;
  ultimaEvolucion: NotaEvolucion | null;
  alumnoId: string;
}) {
  const activas = inscripciones.filter((i) => i.estado === "activa");
  const sedes = [...new Set(inscripciones.map((i) => i.sedeNombre))];
  const actividades = [...new Set(inscripciones.map((i) => i.actividadNombre).filter((a): a is string => a !== null))];
  const proxima = calcularProximaOcurrencia(activas);
  const tieneContactoFamiliar = ficha.existe && (ficha.contactoFamiliarNombre || ficha.contactoFamiliarTelefono);
  const tieneDiasPreferidos = ficha.existe && (ficha.diasPosibles.length > 0 || ficha.turnosPosibles.length > 0 || ficha.horariosPosibles);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Datos principales</h2>
        <dl className="flex flex-col gap-2.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-500">Teléfono</dt>
            <dd className="text-neutral-800">{telefono ?? "Sin registrar"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-500">Email</dt>
            <dd className="min-w-0 truncate text-neutral-800">{email}</dd>
          </div>
          {sedes.length > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-500">Sede/s</dt>
              <dd className="text-right text-neutral-800">{sedes.join(", ")}</dd>
            </div>
          )}
          {actividades.length > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-500">Actividad/es</dt>
              <dd className="text-right text-neutral-800">{actividades.join(", ")}</dd>
            </div>
          )}
          {tieneContactoFamiliar && (
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-500">Contacto familiar</dt>
              <dd className="text-right text-neutral-800">
                {ficha.contactoFamiliarNombre}
                {ficha.contactoFamiliarVinculo ? ` (${ficha.contactoFamiliarVinculo})` : ""}
                {ficha.contactoFamiliarTelefono ? ` · ${ficha.contactoFamiliarTelefono}` : ""}
              </dd>
            </div>
          )}
          {tieneDiasPreferidos && (
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-500">Días/turnos preferidos</dt>
              <dd className="text-right text-neutral-800">
                {[
                  ficha.diasPosibles.map((d) => diaLabel(d)).join(", "),
                  ficha.turnosPosibles.map((t) => TURNO_LABELS[t]).join(", "),
                  ficha.horariosPosibles,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </dd>
            </div>
          )}
        </dl>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Estado de cuota actual</h2>
        {cuotas.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin inscripciones vigentes.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {cuotas.map((c) => {
              const label = CUOTA_VARIANT[c.estado];
              return (
                <div key={c.sedeId} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900">{c.sedeNombre}</p>
                    {c.monto != null && (
                      <p className="text-xs text-neutral-500">
                        ${c.monto.toLocaleString("es-AR")}
                        {c.vencimiento && ` · vence ${formatearFecha(c.vencimiento)}`}
                        {c.medio && ` · pagado con ${MEDIO_TEXTO[c.medio]}`}
                      </p>
                    )}
                  </div>
                  <Badge variant={label.variant}>{label.texto}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Próxima clase</h2>
        {proxima ? (
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-medium text-neutral-900">
              {proxima.actividadNombre ?? "Actividad sin clasificar"} · {proxima.sedeNombre}
            </p>
            <p className="text-neutral-600">
              {diaLabel(proxima.diaSemana)} {formatearFecha(fechaProximaOcurrencia(proxima))} · {proxima.horaInicio.slice(0, 5)}-
              {proxima.horaFin.slice(0, 5)}
            </p>
            <p className="text-neutral-500">Prof. {proxima.profesorNombre}</p>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Sin clases activas.</p>
        )}
        <Link href={`/admin/alumnos/${alumnoId}?tab=clases`} className="mt-2 inline-block text-xs font-medium text-primary-600 hover:underline">
          Ver todas sus clases
        </Link>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-neutral-900">Resumen de actividades</h2>
        {activas.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin clases activas.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {activas.map((i) => (
              <div key={i.inscripcionId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-neutral-900">
                  {i.actividadNombre ?? i.sedeNombre}
                  {i.actividadNombre && ` · ${i.sedeNombre}`}
                </span>
                <span className="text-neutral-500">
                  {diaLabel(i.diaSemana)} {i.horaInicio.slice(0, 5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="lg:col-span-2">
        <h2 className="mb-3 font-semibold text-neutral-900">Última evolución</h2>
        {ultimaEvolucion ? (
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-neutral-900">{ultimaEvolucion.autorNombre}</span>
                <Badge variant="neutral">{CATEGORIA_EVOLUCION_LABELS[ultimaEvolucion.categoria]}</Badge>
              </div>
              <span className="text-xs text-neutral-400">{formatearFecha(ultimaEvolucion.fecha)}</span>
            </div>
            <p className="whitespace-pre-wrap text-neutral-700">{ultimaEvolucion.contenido}</p>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Todavía no hay notas de evolución.</p>
        )}
        <Link href={`/admin/alumnos/${alumnoId}?tab=evolucion`} className="mt-2 inline-block text-xs font-medium text-primary-600 hover:underline">
          Ver evolución completa
        </Link>
      </Card>
    </div>
  );
}
