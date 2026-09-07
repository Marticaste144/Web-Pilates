"use client";

import { useMemo, useState } from "react";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import type { ClaseListItem } from "@/lib/admin/clases-data";
import { ClasesTable } from "./clases-table";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

type Filtros = {
  sedeId: string;
  actividadId: string;
  dia: string;
  profesor: string;
};

const FILTROS_VACIOS: Filtros = { sedeId: "", actividadId: "", dia: "", profesor: "" };

function diaLabel(dia: number): string {
  return DIAS_SEMANA.find((d) => d.value === dia)?.label ?? String(dia);
}

// Las opciones de cada filtro salen de las clases reales que ya existen
// (nunca de una lista hardcodeada aparte) -- así nunca se puede filtrar por
// una sede/actividad/profesor que en los hechos no tiene ninguna clase
// cargada, y el filtro nunca queda desactualizado si se agrega/saca algo.
export function ClasesFiltros({ clases }: { clases: ClaseListItem[] }) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);

  const opciones = useMemo(() => {
    const sedes = new Map<string, string>();
    const actividades = new Map<string, string>();
    const profesores = new Set<string>();
    const dias = new Set<number>();

    for (const c of clases) {
      sedes.set(c.sedeId, c.sedeNombre);
      if (c.actividadId && c.actividadNombre) actividades.set(c.actividadId, c.actividadNombre);
      profesores.add(c.profesorNombre);
      dias.add(c.diaSemana);
    }

    return {
      sedes: [...sedes.entries()].sort((a, b) => a[1].localeCompare(b[1], "es")),
      actividades: [...actividades.entries()].sort((a, b) => a[1].localeCompare(b[1], "es")),
      profesores: [...profesores].sort((a, b) => a.localeCompare(b, "es")),
      dias: [...dias].sort((a, b) => a - b),
    };
  }, [clases]);

  const clasesFiltradas = useMemo(() => {
    return clases.filter((c) => {
      if (filtros.sedeId && c.sedeId !== filtros.sedeId) return false;
      if (filtros.actividadId && c.actividadId !== filtros.actividadId) return false;
      if (filtros.dia && c.diaSemana !== Number(filtros.dia)) return false;
      if (filtros.profesor && c.profesorNombre !== filtros.profesor) return false;
      return true;
    });
  }, [clases, filtros]);

  const hayFiltrosActivos = JSON.stringify(filtros) !== JSON.stringify(FILTROS_VACIOS);
  // Firma estable de los filtros activos -- se usa como key de ClasesTable
  // para que su paginación interna vuelva sola a la página 1 apenas cambia
  // el resultado filtrado, sin tener que levantar ese estado hasta acá.
  const filtrosKey = JSON.stringify(filtros);

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Select
            aria-label="Filtrar por sede"
            value={filtros.sedeId}
            onChange={(e) => setFiltros((f) => ({ ...f, sedeId: e.target.value }))}
          >
            <option value="">Todas las sedes</option>
            {opciones.sedes.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filtrar por actividad"
            value={filtros.actividadId}
            onChange={(e) => setFiltros((f) => ({ ...f, actividadId: e.target.value }))}
          >
            <option value="">Todas las actividades</option>
            {opciones.actividades.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filtrar por día"
            value={filtros.dia}
            onChange={(e) => setFiltros((f) => ({ ...f, dia: e.target.value }))}
          >
            <option value="">Todos los días</option>
            {opciones.dias.map((d) => (
              <option key={d} value={d}>
                {diaLabel(d)}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filtrar por profesor/a"
            value={filtros.profesor}
            onChange={(e) => setFiltros((f) => ({ ...f, profesor: e.target.value }))}
          >
            <option value="">Todos los profesores</option>
            {opciones.profesores.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-400">
            {clasesFiltradas.length} de {clases.length} clase{clases.length === 1 ? "" : "s"}
          </p>
          {hayFiltrosActivos && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setFiltros(FILTROS_VACIOS)}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </Card>

      <ClasesTable key={filtrosKey} clases={clasesFiltradas} />
    </div>
  );
}
