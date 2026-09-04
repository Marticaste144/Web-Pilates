"use client";

import { useState } from "react";
import type { AlumnoInscripcionItem, AlumnoClaseAnteriorItem, AsistenciaClaseMes } from "@/lib/admin/alumnos-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function diaLabel(dia: number): string {
  return DIAS_SEMANA.find((d) => d.value === dia)?.label ?? String(dia);
}

function formatearFechaCorta(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function formatearFecha(fechaIso: string): string {
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR");
}

// Punto/check/cruz -- estados reales de "asistencias", nunca inventados
// (ver listarAsistenciasDelMesAlumno). "Recuperación" se suma más adelante
// cuando exista esa información (no todavía -- pedido explícito de no
// inventarla).
function CeldaAsistencia({ estado }: { estado: "presente" | "ausente" | "sin_marcar" }) {
  if (estado === "presente") {
    return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-100 text-success-700" title="Presente">✓</span>;
  }
  if (estado === "ausente") {
    return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-error-100 text-error-600" title="Ausente">✕</span>;
  }
  return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-300" title="Sin marcar">•</span>;
}

export function ClasesTab({
  inscripciones,
  asistenciasDelMes,
  clasesAnteriores,
}: {
  inscripciones: AlumnoInscripcionItem[];
  asistenciasDelMes: AsistenciaClaseMes[];
  clasesAnteriores: AlumnoClaseAnteriorItem[];
}) {
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  // Columnas = unión de todas las fechas que aparecen en cualquier clase
  // (normalmente coinciden, salvo que dos clases empezaron en días
  // distintos del mes) -- ordenadas, sin repetir.
  const fechasColumnas = [...new Set(asistenciasDelMes.flatMap((c) => c.dias.map((d) => d.fecha)))].sort();

  return (
    <div className="flex flex-col gap-4">
      <Card padded={false} className="overflow-x-auto">
        <h2 className="p-4 pb-3 font-semibold text-neutral-900">Clases actuales</h2>
        {inscripciones.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-neutral-400">No está anotado/a en ninguna clase.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Actividad</th>
                <th className="px-4 py-2.5 font-medium">Sede</th>
                <th className="px-4 py-2.5 font-medium">Día</th>
                <th className="px-4 py-2.5 font-medium">Horario</th>
                <th className="px-4 py-2.5 font-medium">Profesor</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {inscripciones.map((i) => (
                <tr key={i.inscripcionId} className="border-t border-neutral-100">
                  <td className="px-4 py-2.5 font-medium text-neutral-900">{i.actividadNombre ?? "Sin clasificar"}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{i.sedeNombre}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{diaLabel(i.diaSemana)}</td>
                  <td className="px-4 py-2.5 text-neutral-600">
                    {i.horaInicio.slice(0, 5)} - {i.horaFin.slice(0, 5)}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">{i.profesorNombre}</td>
                  <td className="px-4 py-2.5">
                    {i.estado === "activa" ? (
                      <Badge variant="success">Activa</Badge>
                    ) : (
                      <Badge variant="warning">Lista de espera · #{i.posicionEspera}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card padded={false} className="overflow-x-auto">
        <h2 className="p-4 pb-3 font-semibold text-neutral-900">Asistencias del mes</h2>
        {asistenciasDelMes.length === 0 || fechasColumnas.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-neutral-400">Sin fechas de clase todavía este mes.</p>
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Actividad</th>
                  {fechasColumnas.map((f) => (
                    <th key={f} className="px-2 py-2.5 text-center font-medium whitespace-nowrap">
                      {formatearFechaCorta(f)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {asistenciasDelMes.map((c) => {
                  const estadoPorFecha = new Map(c.dias.map((d) => [d.fecha, d.estado]));
                  return (
                    <tr key={c.claseId} className="border-t border-neutral-100">
                      <td className="px-4 py-2.5 font-medium text-neutral-900">
                        {c.actividadNombre ?? c.sedeNombre}
                      </td>
                      {fechasColumnas.map((f) => (
                        <td key={f} className="px-2 py-2 text-center">
                          {estadoPorFecha.has(f) ? <CeldaAsistencia estado={estadoPorFecha.get(f)!} /> : <span />}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center gap-3 p-4 pt-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success-100 text-success-700 text-[10px]">✓</span>
                Presente
              </span>
              <span className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-error-100 text-error-600 text-[10px]">✕</span>
                Ausente
              </span>
              <span className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-100 text-neutral-300 text-[10px]">•</span>
                Sin marcar
              </span>
            </div>
          </>
        )}
      </Card>

      {clasesAnteriores.length > 0 && (
        <Card padded={false}>
          <div className="flex items-center justify-between p-4 pb-3">
            <h2 className="font-semibold text-neutral-900">Historial de clases anteriores</h2>
            <Button variant="ghost" size="sm" onClick={() => setMostrarHistorial((v) => !v)}>
              {mostrarHistorial ? "Ocultar" : `Ver (${clasesAnteriores.length})`}
            </Button>
          </div>
          {mostrarHistorial && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Actividad</th>
                    <th className="px-4 py-2.5 font-medium">Sede</th>
                    <th className="px-4 py-2.5 font-medium">Horario</th>
                    <th className="px-4 py-2.5 font-medium">Baja</th>
                  </tr>
                </thead>
                <tbody>
                  {clasesAnteriores.map((c) => (
                    <tr key={c.inscripcionId} className="border-t border-neutral-100">
                      <td className="px-4 py-2.5 font-medium text-neutral-900">{c.actividadNombre ?? "Sin clasificar"}</td>
                      <td className="px-4 py-2.5 text-neutral-600">{c.sedeNombre}</td>
                      <td className="px-4 py-2.5 text-neutral-600">
                        {diaLabel(c.diaSemana)} {c.horaInicio.slice(0, 5)}-{c.horaFin.slice(0, 5)}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-600">{c.fechaBaja ? formatearFecha(c.fechaBaja) : "?"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
