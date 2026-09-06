"use client";

import { useState, type CSSProperties } from "react";
import type { WorkbookExcel, CeldaExcel } from "@/lib/planificaciones-excel";
import { EmptyState } from "@/components/ui/empty-state";

function estiloCelda(celda: CeldaExcel): CSSProperties {
  return {
    fontWeight: celda.negrita ? 700 : 400,
    fontStyle: celda.cursiva ? "italic" : "normal",
    textAlign: celda.alineacion ?? (celda.tipo === "numero" ? "right" : "left"),
    backgroundColor: celda.colorFondo ?? undefined,
    color: celda.colorTexto ?? undefined,
    borderTop: celda.bordes.top ? "1px solid #94a3b8" : undefined,
    borderBottom: celda.bordes.bottom ? "1px solid #94a3b8" : undefined,
    borderLeft: celda.bordes.left ? "1px solid #94a3b8" : undefined,
    borderRight: celda.bordes.right ? "1px solid #94a3b8" : undefined,
  };
}

// Visor tipo spreadsheet: se prioriza legibilidad/estructura, no fidelidad
// 100% idéntica a Excel (pedido explícito del bloque). Cada hoja se
// renderiza como una <table> HTML con colgroup para los anchos, colspan/
// rowspan para las celdas combinadas, y estilos inline resueltos server-side
// en lib/planificaciones-excel.ts -- acá solo se pinta lo que ya viene
// calculado, no se vuelve a tocar el archivo.
export function ExcelViewer({ workbook }: { workbook: WorkbookExcel }) {
  const [hojaIdx, setHojaIdx] = useState(0);
  const hoja = workbook.hojas[hojaIdx];

  if (!hoja) {
    return <EmptyState title="Este archivo no tiene hojas para mostrar" />;
  }

  const hayVariasHojas = workbook.hojas.length > 1;
  const hojaVacia = hoja.filas.length === 0 || hoja.filas.every((f) => f.celdas.every((c) => c.tipo === "vacio"));

  return (
    <div className="flex flex-col gap-2">
      {hayVariasHojas && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {workbook.hojas.map((h, i) => (
            <button
              key={`${h.nombre}-${i}`}
              type="button"
              onClick={() => setHojaIdx(i)}
              className={`shrink-0 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                i === hojaIdx
                  ? "border-primary-600 bg-primary-600 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-primary-300"
              }`}
            >
              {h.nombre}
            </button>
          ))}
        </div>
      )}

      {hojaVacia ? (
        <EmptyState title="Esta hoja está vacía" />
      ) : (
        <div className="overflow-auto rounded-card border border-neutral-200 bg-white" style={{ maxHeight: "70vh" }}>
          <table className="border-collapse text-sm" style={{ tableLayout: "fixed" }}>
            <colgroup>
              {hoja.anchosColumnasPx.map((ancho, i) => (
                <col key={i} style={{ width: `${ancho}px` }} />
              ))}
            </colgroup>
            <tbody>
              {hoja.filas.map((fila, filaIdx) => (
                <tr key={filaIdx} style={{ height: fila.altoPx ? `${fila.altoPx}px` : undefined }}>
                  {fila.celdas.map((celda, colIdx) =>
                    celda.oculta ? null : (
                      <td
                        key={colIdx}
                        colSpan={celda.colspan > 1 ? celda.colspan : undefined}
                        rowSpan={celda.rowspan > 1 ? celda.rowspan : undefined}
                        className="whitespace-pre-wrap border border-neutral-100 px-2 py-1 align-top text-neutral-800"
                        style={estiloCelda(celda)}
                      >
                        {celda.valor === null ? "" : String(celda.valor)}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
