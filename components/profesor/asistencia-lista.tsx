"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { marcarAsistencia, agregarAlumnoNoRegistrado } from "@/lib/profesor/asistencia-actions";
import { buscarAlumnasPilates, agregarRecuperacionPilates, type AlumnaPilatesItem } from "@/lib/profesor/recuperaciones-actions";
import type { AlumnoAsistenciaItem } from "@/lib/profesor/clases-data";
import type { EstadoAsistencia } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

function itemKey(a: AlumnoAsistenciaItem): string {
  return a.alumnoId ?? a.asistenciaId!;
}

// El profesor abre la clase y ya ve a TODA su lista de inscriptas con
// Presente/Ausente disponibles -- no hace falta que la alumna confirme antes
// ni que el profesor la "agregue" a ninguna lista aparte: marcar un estado
// crea la fila de asistencia si todavía no existía (ver marcarAsistencia).
// El estado de presente/ausente vive en un solo componente (no una fila por
// componente) para que las cards de resumen se actualicen en vivo con cada
// marca, sin recargar la página.
export function AsistenciaLista({
  claseId,
  fecha,
  roster,
  esPilates = false,
}: {
  claseId: string;
  fecha: string;
  roster: AlumnoAsistenciaItem[];
  /** Las recuperaciones son SOLO para Pilates -- el buscador no se muestra en el resto de las actividades. */
  esPilates?: boolean;
}) {
  const [estados, setEstados] = useState<Record<string, EstadoAsistencia | null>>(() =>
    Object.fromEntries(roster.map((a) => [itemKey(a), a.asistenciaEstado])),
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [mostrarFormManual, setMostrarFormManual] = useState(false);
  const [manualPending, startManualTransition] = useTransition();
  const [manualMsg, setManualMsg] = useState<string | null>(null);

  const [mostrarRecuperacion, setMostrarRecuperacion] = useState(false);
  const [queryRecuperacion, setQueryRecuperacion] = useState("");
  const [resultadosRecuperacion, setResultadosRecuperacion] = useState<AlumnaPilatesItem[]>([]);
  const [buscandoRecuperacion, startBusquedaRecuperacion] = useTransition();
  const [agregandoAlumnoId, setAgregandoAlumnoId] = useState<string | null>(null);
  const [recuperacionMsg, setRecuperacionMsg] = useState<string | null>(null);
  const [, startAgregarRecuperacion] = useTransition();

  const estadoDe = (a: AlumnoAsistenciaItem) => estados[itemKey(a)] ?? a.asistenciaEstado;
  const presentes = roster.filter((a) => estadoDe(a) === "presente").length;
  const ausentes = roster.filter((a) => estadoDe(a) === "ausente").length;

  function marcar(a: AlumnoAsistenciaItem, estado: "presente" | "ausente") {
    const key = itemKey(a);
    setPendingKey(key);
    setError(null);
    startTransition(async () => {
      const result = await marcarAsistencia(claseId, fecha, a.alumnoId, a.asistenciaId, estado);
      if (result.ok) {
        setEstados((prev) => ({ ...prev, [key]: estado }));
      } else {
        setError(result.message);
      }
      setPendingKey(null);
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

  function buscarRecuperacion(texto: string) {
    setQueryRecuperacion(texto);
    setRecuperacionMsg(null);
    if (texto.trim().length < 2) {
      setResultadosRecuperacion([]);
      return;
    }
    startBusquedaRecuperacion(async () => {
      setResultadosRecuperacion(await buscarAlumnasPilates(texto));
    });
  }

  function agregarRecuperacion(alumnoId: string) {
    setAgregandoAlumnoId(alumnoId);
    setRecuperacionMsg(null);
    startAgregarRecuperacion(async () => {
      const result = await agregarRecuperacionPilates(claseId, fecha, alumnoId);
      setRecuperacionMsg(result.message);
      setAgregandoAlumnoId(null);
      if (result.ok) {
        setQueryRecuperacion("");
        setResultadosRecuperacion([]);
      }
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
            {presentes + ausentes}/{roster.length}
          </p>
          <p className="text-xs font-medium text-neutral-500">Total</p>
        </div>
      </div>

      {error && <p className="rounded-xl bg-error-50 px-3.5 py-2.5 text-sm text-error-700">{error}</p>}

      {roster.length === 0 ? (
        <p className="rounded-xl bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-500">
          Todavía no hay nadie en la lista de esta clase.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-card border border-neutral-100 bg-white">
          {roster.map((a) => {
            const estado = estadoDe(a);
            const key = itemKey(a);
            const pending = pendingKey === key;
            const nombreCompleto = (
              <p className="truncate font-medium text-neutral-900">
                {a.nombre} {a.apellido}
              </p>
            );
            return (
              <div key={key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  {a.alumnoId ? (
                    <Link href={`/profesor/alumnas/${a.alumnoId}`} className="hover:underline">
                      {nombreCompleto}
                    </Link>
                  ) : (
                    nombreCompleto
                  )}
                  {(a.noRegistrado || a.esRecuperacion) && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {a.esRecuperacion && <Badge variant="info">Recuperación</Badge>}
                      {a.noRegistrado && (
                        <Badge variant="warning">
                          No pertenece a esta clase
                          {a.manualSedeHabitual || a.manualProfesorHabitual
                            ? ` (habitual: ${[a.manualSedeHabitual, a.manualProfesorHabitual].filter(Boolean).join(" · ")})`
                            : ""}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => marcar(a, "presente")}
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
                    onClick={() => marcar(a, "ausente")}
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

      {esPilates && (
        <div className="rounded-card border border-neutral-200 bg-white p-4">
          <p className="font-semibold text-neutral-900">Agregar recuperación</p>
          <p className="mt-1 text-sm text-neutral-500">
            Solo para Pilates: una alumna que coordinó por WhatsApp reponer una clase que faltó este mes.
          </p>

          {!mostrarRecuperacion ? (
            <button
              type="button"
              onClick={() => setMostrarRecuperacion(true)}
              className="mt-2 text-sm font-medium text-primary-600 hover:underline"
            >
              Agregar recuperación
            </button>
          ) : (
            <div className="mt-3 flex flex-col gap-3 rounded-xl bg-neutral-50 p-3">
              <Field label="Buscar alumna" className="min-w-0">
                <Input
                  value={queryRecuperacion}
                  onChange={(e) => buscarRecuperacion(e.target.value)}
                  placeholder="Nombre o apellido..."
                  autoFocus
                />
              </Field>

              {buscandoRecuperacion && <p className="text-xs text-neutral-400">Buscando...</p>}

              {!buscandoRecuperacion && queryRecuperacion.trim().length >= 2 && resultadosRecuperacion.length === 0 && (
                <p className="text-xs text-neutral-500">No se encontró ninguna alumna con Pilates activo con ese nombre.</p>
              )}

              {resultadosRecuperacion.length > 0 && (
                <div className="flex flex-col divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white">
                  {resultadosRecuperacion.map((r) => (
                    <div key={r.alumnoId} className="flex items-center justify-between gap-3 p-2.5">
                      <p className="min-w-0 truncate text-sm font-medium text-neutral-900">
                        {r.nombre} {r.apellido}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        loading={agregandoAlumnoId === r.alumnoId}
                        onClick={() => agregarRecuperacion(r.alumnoId)}
                      >
                        Agregar
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => {
                  setMostrarRecuperacion(false);
                  setQueryRecuperacion("");
                  setResultadosRecuperacion([]);
                }}
              >
                Cerrar
              </Button>
            </div>
          )}
          {recuperacionMsg && <p className="mt-2 text-xs text-neutral-500">{recuperacionMsg}</p>}
        </div>
      )}

      <div className="rounded-card border border-neutral-200 bg-white p-4">
        <p className="font-semibold text-neutral-900">¿Alguien más vino a esta clase?</p>
          <p className="mt-1 text-sm text-neutral-500">Alguien que no está anotado en esta clase/sede (caso puntual).</p>

          {!mostrarFormManual ? (
            <button
              type="button"
              onClick={() => setMostrarFormManual(true)}
              className="mt-2 text-sm font-medium text-primary-600 hover:underline"
            >
              Agregar a la lista
            </button>
          ) : (
            <form action={agregarManual} className="mt-3 flex flex-col gap-3 rounded-xl bg-neutral-50 p-3">
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

      <Link
        href="/profesor"
        className="inline-flex items-center justify-center rounded-xl bg-secondary-500 px-6 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-secondary-600"
      >
        Guardar asistencia
      </Link>
    </div>
  );
}
