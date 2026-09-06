"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import type { ClaseListItem } from "@/lib/admin/clases-data";
import { Card } from "@/components/ui/card";
import { ChevronRightIcon } from "@/components/ui/icons";
import { ToggleActivaButton } from "./toggle-activa-button";

// CORRECCIÓN (auditoría general): la versión anterior media el alto real
// disponible con ResizeObserver y encerraba la tabla en un contenedor
// `overflow-hidden` de alto fijo (`md:h-[calc(100dvh-7.25rem)]` en
// page.tsx) para que "todo entrara sin scroll de página" -- en la práctica,
// cualquier diferencia entre los px asumidos (ROW_HEIGHT/HEADER_HEIGHT) y
// el alto real render izado (fuente todavía no cargada al medir, zoom del
// navegador, alto real del header/form de arriba) hacía que la tabla
// calculara más filas de las que en verdad entraban, y el `overflow-hidden`
// las recortaba en vez de mostrarlas -- de ahí "filas parcialmente
// ocultas" / "paginador tapado". Se cambia a un tamaño de página FIJO por
// breakpoint (sin medir nada) y se deja que la PÁGINA scrollee
// normalmente si hace falta -- un comportamiento estándar y sin riesgo de
// recorte, en vez de forzar todo a una sola pantalla.
const ROWS_DESKTOP = 10;
const ROWS_MOBILE = 6;

function diaLabel(dia: number) {
  return DIAS_SEMANA.find((d) => d.value === dia)?.label ?? String(dia);
}

const MODALIDAD_LABEL: Record<string, string> = { grupal: "Grupal", personalizada: "Personalizada" };

// Ventana de números de página al estilo "1 … 4 5 6 … 12": siempre primera,
// última, la actual y una vecina de cada lado; el resto se resume con "…".
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current - 1, current, current + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - (nums[i - 1] as number) > 1) out.push("…");
    out.push(n);
  });
  return out;
}

function Paginacion({
  clasesLength,
  currentPage,
  totalPages,
  onCambiarPagina,
}: {
  clasesLength: number;
  currentPage: number;
  totalPages: number;
  onCambiarPagina: (n: number) => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-4 py-3">
      <p className="text-xs text-neutral-400">
        {clasesLength} clase{clasesLength === 1 ? "" : "s"}
      </p>
      <nav className="flex items-center gap-1" aria-label="Paginación de clases">
        <button
          type="button"
          onClick={() => onCambiarPagina(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label="Página anterior"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRightIcon className="h-4 w-4 rotate-180" />
        </button>

        {pageWindow(currentPage, totalPages).map((n, i) =>
          n === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-neutral-400">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onCambiarPagina(n)}
              aria-current={n === currentPage ? "page" : undefined}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                n === currentPage ? "bg-primary-600 text-white" : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {n}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onCambiarPagina(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          aria-label="Página siguiente"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}

export function ClasesTable({ clases }: { clases: ClaseListItem[] }) {
  // Un solo breakpoint (md, 768px) para decidir tabla vs. cards -- no hace
  // falta medir nada, matchMedia alcanza y no depende de layout todavía sin
  // asentar (a diferencia de ResizeObserver sobre un contenedor con
  // overflow-hidden, que sí se prestaba a medir mal).
  const [esDesktop, setEsDesktop] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const aplicar = () => setEsDesktop(mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

  const rowsPerPage = esDesktop ? ROWS_DESKTOP : ROWS_MOBILE;
  const totalPages = Math.max(1, Math.ceil(clases.length / rowsPerPage));
  // Derivado en vez de sincronizado con un efecto: si rowsPerPage cambia (se
  // cruza el breakpoint) y el "page" guardado quedó fuera de rango, acá se
  // corrige para este render sin necesitar un setState extra.
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const visibles = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return clases.slice(start, start + rowsPerPage);
  }, [clases, currentPage, rowsPerPage]);

  if (clases.length === 0) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-neutral-400">Todavía no hay clases cargadas.</p>
      </Card>
    );
  }

  return (
    <Card padded={false} className="flex flex-col">
      {/* Desktop/tablet (md+): tabla completa, sin comprimir columnas. */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Sede</th>
              <th className="px-4 py-3 font-medium">Actividad</th>
              <th className="px-4 py-3 font-medium">Modalidad</th>
              <th className="px-4 py-3 font-medium">Día</th>
              <th className="px-4 py-3 font-medium">Horario</th>
              <th className="px-4 py-3 font-medium">Profesor/a</th>
              <th className="px-4 py-3 font-medium">Cupo</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visibles.map((c) => (
              <tr key={c.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 text-neutral-900">{c.sedeNombre}</td>
                <td className="px-4 py-3 text-neutral-600">{c.actividadNombre ?? "-"}</td>
                <td className="px-4 py-3 text-neutral-600">{c.modalidad ? MODALIDAD_LABEL[c.modalidad] : "-"}</td>
                <td className="px-4 py-3 text-neutral-600">{diaLabel(c.diaSemana)}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {c.horaInicio.slice(0, 5)} - {c.horaFin.slice(0, 5)}
                </td>
                <td className="px-4 py-3 text-neutral-600">{c.profesorNombre}</td>
                <td className="px-4 py-3 text-neutral-600">{c.cupo}</td>
                <td className="px-4 py-3">
                  <ToggleActivaButton id={c.id} activa={c.activa} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/clases/${c.id}`} className="font-medium text-primary-600 hover:underline">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile (<md): cards -- misma información y mismas acciones que la
          tabla (nada se pierde), sin comprimir 9 columnas ni forzar scroll
          horizontal de una tabla angosta. */}
      <div className="flex flex-col divide-y divide-neutral-100 md:hidden">
        {visibles.map((c) => (
          <div key={c.id} className="flex flex-col gap-2.5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900">{c.sedeNombre}</p>
                <p className="text-sm text-neutral-600">
                  {c.actividadNombre ?? "Sin clasificar"}
                  {c.modalidad ? ` · ${MODALIDAD_LABEL[c.modalidad]}` : ""}
                </p>
              </div>
              <ToggleActivaButton id={c.id} activa={c.activa} />
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              <div>
                <p className="text-xs text-neutral-400">Día y horario</p>
                <p className="text-neutral-800">
                  {diaLabel(c.diaSemana)} {c.horaInicio.slice(0, 5)}-{c.horaFin.slice(0, 5)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Profesor/a</p>
                <p className="text-neutral-800">{c.profesorNombre}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Cupo</p>
                <p className="text-neutral-800">{c.cupo}</p>
              </div>
            </div>

            <Link
              href={`/admin/clases/${c.id}`}
              className="inline-flex w-full items-center justify-center rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-primary-600 transition-colors hover:border-primary-300 hover:bg-primary-50"
            >
              Editar
            </Link>
          </div>
        ))}
      </div>

      <Paginacion clasesLength={clases.length} currentPage={currentPage} totalPages={totalPages} onCambiarPagina={setPage} />
    </Card>
  );
}
