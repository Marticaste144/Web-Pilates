"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import type { ClaseListItem } from "@/lib/admin/clases-data";
import { Card } from "@/components/ui/card";
import { ChevronRightIcon } from "@/components/ui/icons";
import { ToggleActivaButton } from "./toggle-activa-button";

// Altura fija de cada fila del cuerpo (px-4 py-3 + text-sm de línea 20px + 1px
// de border-top) y del thead (misma celda, sin border). Son valores fijos --
// no dependen del contenido real (sede/profesor son textos cortos de una
// sola línea) -- así se puede calcular cuántas filas entran sin medir cada
// fila una por una.
const ROW_HEIGHT = 45;
const HEADER_HEIGHT = 44;
const MIN_ROWS = 3;

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

export function ClasesTable({ clases }: { clases: ClaseListItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 8 es solo el valor inicial antes de medir (primer render/SSR) -- se
  // recalcula enseguida según el alto real disponible.
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const el = containerRef.current;

    function compute() {
      const w = window.innerWidth;
      // md+: el contenedor tiene alto acotado por CSS (ver page.tsx), así que
      // medirlo da la cantidad real de filas que entran. Por debajo de md la
      // página fluye normalmente (sin alto fijo) para no arriesgar recortar
      // el formulario en pantallas chicas -- ahí alcanza con un valor fijo
      // por breakpoint.
      if (w >= 768 && el) {
        const available = el.clientHeight - HEADER_HEIGHT;
        setRowsPerPage(Math.max(MIN_ROWS, Math.floor(available / ROW_HEIGHT)));
      } else if (w >= 640) {
        setRowsPerPage(7);
      } else {
        setRowsPerPage(5);
      }
    }

    compute();
    const resizeObserver = el ? new ResizeObserver(compute) : null;
    if (resizeObserver && el) resizeObserver.observe(el);
    window.addEventListener("resize", compute);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(clases.length / rowsPerPage));
  // Derivado en vez de sincronizado con un efecto: si rowsPerPage cambia (se
  // redimensiona la ventana) y el "page" guardado quedó fuera de rango, acá
  // se corrige para este render sin necesitar un setState extra.
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const visibles = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return clases.slice(start, start + rowsPerPage);
  }, [clases, currentPage, rowsPerPage]);

  return (
    <Card padded={false} className="flex min-h-0 flex-col overflow-hidden md:flex-1">
      <div ref={containerRef} className="min-h-0 overflow-x-auto overflow-y-hidden md:flex-1">
        <table className="w-full min-w-[820px] text-left text-sm md:min-w-0">
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
            {clases.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-neutral-400">
                  Todavía no hay clases cargadas.
                </td>
              </tr>
            )}
            {visibles.map((c) => (
              <tr key={c.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 text-neutral-900">{c.sedeNombre}</td>
                <td className="px-4 py-3 text-neutral-600">{c.actividadNombre ?? "-"}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {c.modalidad ? MODALIDAD_LABEL[c.modalidad] : "-"}
                </td>
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

      {clases.length > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-neutral-100 px-4 py-2.5">
          <p className="hidden text-xs text-neutral-400 sm:block">
            {clases.length} clase{clases.length === 1 ? "" : "s"}
          </p>
          <nav className="flex items-center gap-1" aria-label="Paginación de clases">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              aria-label="Página anterior"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-30"
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
                  onClick={() => setPage(n)}
                  aria-current={n === currentPage ? "page" : undefined}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                    n === currentPage ? "bg-primary-600 text-white" : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {n}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              aria-label="Página siguiente"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </nav>
        </div>
      )}
    </Card>
  );
}
