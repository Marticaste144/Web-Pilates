"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { marcarAsistencia, agregarAlumnoRoster, agregarAlumnoNoRegistrado } from "@/lib/profesor/asistencia-actions";
import type { AlumnoConfirmadoItem, AlumnoDisponibleItem } from "@/lib/profesor/clases-data";
import type { EstadoAsistencia } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

// La lista principal ahora es "quién confirmó asistencia" (más lo agregado a
// mano por el profesor) -- no todo el roster de la clase como antes. El
// estado de presente/ausente vive en un solo componente (no una fila por
// componente) para que las cards de resumen se actualicen en vivo con cada
// marca, sin recargar la página. `confirmados` y `disponibles` llegan como
// prop desde el Server Component: agregar a alguien (roster o no registrado)
// dispara un router refresh vía revalidatePath, así que las nuevas filas
// aparecen solas en el próximo render sin manejo local de lista.
export function AsistenciaLista({
  claseId,
  fecha,
  confirmados,
  disponibles,
}: {
  claseId: string;
  fecha: string;
  confirmados: AlumnoConfirmadoItem[];
  disponibles: AlumnoDisponibleItem[];
}) {
  const [estados, setEstados] = useState<Record<string, EstadoAsistencia | null>>(() =>
    Object.fromEntries(confirmados.map((a) => [a.asistenciaId, a.asistenciaEstado])),
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [rosterSeleccionado, setRosterSeleccionado] = useState("");
  const [rosterPending, startRosterTransition] = useTransition();
  const [rosterMsg, setRosterMsg] = useState<string | null>(null);

  const [mostrarFormManual, setMostrarFormManual] = useState(false);
  const [manualPending, startManualTransition] = useTransition();
  const [manualMsg, setManualMsg] = useState<string | null>(null);

  const estadoDe = (a: AlumnoConfirmadoItem) => estados[a.asistenciaId] ?? a.asistenciaEstado;
  const presentes = confirmados.filter((a) => estadoDe(a) === "presente").length;
  const ausentes = confirmados.filter((a) => estadoDe(a) === "ausente").length;

  function marcar(asistenciaId: string, estado: "presente" | "ausente") {
    setPendingId(asistenciaId);
    setError(null);
    startTransition(async () => {
      const result = await marcarAsistencia(claseId, asistenciaId, estado);
      if (result.ok) {
        setEstados((prev) => ({ ...prev, [asistenciaId]: estado }));
      } else {
        setError(result.message);
      }
      setPendingId(null);
    });
  }

  function agregarDeRoster() {
    if (!rosterSeleccionado) return;
    setRosterMsg(null);
    startRosterTransition(async () => {
      const result = await agregarAlumnoRoster(claseId, rosterSeleccionado, fecha);
      setRosterMsg(result.message);
      if (result.ok) setRosterSeleccionado("");
    });
  }

  function agregarManual(formData: FormData) {
    setManualMsg(null);
    startManualTransition(async () => {
      const result = await agregarAlumnoNoRegistrado(claseId, fecha, {
        nombre: String(formData.get("nombre") ?? ""),
        apellido: String(formData.get("apellido") ?? ""),
        sedeHabitual: String(formData.get("sede_habitual") ?? ""),
        profesorHabitual: String(formData.get("profesor_habitual") ?? ""),
      });
      setManualMsg(result.message);
      if (result.ok) setMostrarFormManual(false);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-card bg-success-50 p-4 text-center">
          <p className="text-2xl font-bold text-success-700">{presentes}</p>
          <p className="text-xs font-medium text-success-700">Presentes</p>
        </div>
        <div className="rounded-card bg-error-50 p-4 text-center">
          <p className="text-2xl font-bold text-error-600">{ausentes}</p>
          <p className="text-xs font-medium text-error-600">Ausentes</p>
        </div>
        <div className="rounded-card bg-neutral-100 p-4 text-center">
          <p className="text-2xl font-bold text-neutral-900">
            {presentes + ausentes}/{confirmados.length}
          </p>
          <p className="text-xs font-medium text-neutral-500">Total</p>
        </div>
      </div>

      {error && <p className="rounded-xl bg-error-50 px-3.5 py-2.5 text-sm text-error-700">{error}</p>}

      {confirmados.length === 0 ? (
        <p className="rounded-xl bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-500">
          Todavía nadie confirmó asistencia a esta clase. Podés agregar manualmente más abajo.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-card border border-neutral-100 bg-white">
          {confirmados.map((a) => {
            const estado = estadoDe(a);
            const pending = pendingId === a.asistenciaId;
            return (
              <div key={a.asistenciaId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900">
                    {a.nombre} {a.apellido}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {a.confirmado && <Badge variant="success">Confirmó</Badge>}
                    {a.esRecuperacion && <Badge variant="info">Recuperación</Badge>}
                    {a.noRegistrado ? (
                      <Badge variant="warning">
                        Agregada manualmente / no registrada en esta clase
                        {a.manualSedeHabitual || a.manualProfesorHabitual
                          ? ` (habitual: ${[a.manualSedeHabitual, a.manualProfesorHabitual].filter(Boolean).join(" · ")})`
                          : ""}
                      </Badge>
                    ) : (
                      a.agregadoManualmente && <Badge variant="neutral">Agregada por el profesor</Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => marcar(a.asistenciaId, "presente")}
                    className={`rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 sm:px-4 sm:py-2 ${
                      estado === "presente"
                        ? "bg-success-500 text-white"
                        : "bg-success-50 text-success-700 hover:bg-success-100"
                    }`}
                  >
                    Presente
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => marcar(a.asistenciaId, "ausente")}
                    className={`rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 sm:px-4 sm:py-2 ${
                      estado === "ausente"
                        ? "bg-error-500 text-white"
                        : "bg-error-50 text-error-600 hover:bg-error-100"
                    }`}
                  >
                    Ausente
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-card border border-neutral-200 bg-white p-4">
        <p className="font-semibold text-neutral-900">¿Alguien no confirmó a tiempo?</p>

        <div className="mt-3 flex flex-col gap-2">
          <p className="text-sm text-neutral-500">
            Alumna de esta clase que se olvidó de confirmar 1hs antes:
          </p>
          {disponibles.length === 0 ? (
            <p className="text-sm text-neutral-400">Todas las inscriptas visibles ya están en la lista.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Select
                value={rosterSeleccionado}
                onChange={(e) => setRosterSeleccionado(e.target.value)}
                className="max-w-xs"
              >
                <option value="">Elegí una alumna...</option>
                {disponibles.map((d) => (
                  <option key={d.alumnoId} value={d.alumnoId}>
                    {d.apellido}, {d.nombre}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={rosterPending}
                disabled={!rosterSeleccionado}
                onClick={agregarDeRoster}
              >
                Agregar a la lista
              </Button>
            </div>
          )}
          {rosterMsg && <p className="text-xs text-neutral-500">{rosterMsg}</p>}
        </div>

        <div className="mt-4 border-t border-neutral-100 pt-4">
          <p className="text-sm text-neutral-500">
            Alumna de recuperación que no pertenece a esta clase/sede (caso excepcional):
          </p>
          {!mostrarFormManual ? (
            <button
              type="button"
              onClick={() => setMostrarFormManual(true)}
              className="mt-2 text-sm font-medium text-primary-600 hover:underline"
            >
              Cargar alumna no registrada
            </button>
          ) : (
            <form
              action={agregarManual}
              className="mt-3 flex flex-col gap-3 rounded-xl bg-neutral-50 p-3"
            >
              <div className="flex flex-wrap gap-3">
                <Field label="Nombre" className="min-w-0 flex-1">
                  <Input name="nombre" required />
                </Field>
                <Field label="Apellido" className="min-w-0 flex-1">
                  <Input name="apellido" required />
                </Field>
              </div>
              <div className="flex flex-wrap gap-3">
                <Field label="Sede/turno habitual" className="min-w-0 flex-1">
                  <Input name="sede_habitual" placeholder="Ej. MUV Pilates, lunes 18hs" />
                </Field>
                <Field label="Profesor habitual" className="min-w-0 flex-1">
                  <Input name="profesor_habitual" />
                </Field>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={manualPending}>
                  Agregar
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setMostrarFormManual(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
          {manualMsg && <p className="mt-2 text-xs text-neutral-500">{manualMsg}</p>}
        </div>
      </div>

      <Link
        href="/profesor"
        className="inline-flex items-center justify-center rounded-xl bg-secondary-500 px-6 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-secondary-600"
      >
        Guardar asistencia
      </Link>
    </div>
  );
}
