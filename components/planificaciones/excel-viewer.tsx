"use client";

import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import type { WorkbookExcel, CeldaExcel, CambioCeldaExcel } from "@/lib/planificaciones-excel";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

type GuardarFn = (cambios: CambioCeldaExcel[]) => Promise<{ ok: boolean; message: string }>;

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

function textoOriginal(celda: CeldaExcel): string {
  return celda.valor === null ? "" : String(celda.valor);
}

// Clave de un cambio pendiente: índice de hoja + fila/columna (0-based del visor).
function clave(hojaIdx: number, filaIdx: number, colIdx: number) {
  return `${hojaIdx}:${filaIdx}:${colIdx}`;
}

// Visor tipo spreadsheet: se prioriza legibilidad/estructura, no fidelidad
// 100% idéntica a Excel (pedido explícito del bloque). Cada hoja se
// renderiza como una <table> HTML con colgroup para los anchos, colspan/
// rowspan para las celdas combinadas, y estilos inline resueltos server-side
// en lib/planificaciones-excel.ts -- acá solo se pinta lo que ya viene
// calculado, no se vuelve a tocar el archivo.
//
// Con onGuardar, las celdas se pueden completar: click -> se edita en el
// lugar (Enter baja, Tab avanza, Esc cancela). Los cambios quedan
// pendientes acá hasta "Guardar cambios" -- se mandan solo las celdas
// tocadas, nunca el archivo entero. Las fórmulas no se editan.
export function ExcelViewer({ workbook, onGuardar }: { workbook: WorkbookExcel; onGuardar?: GuardarFn }) {
  const [hojaIdx, setHojaIdx] = useState(0);
  const [cambios, setCambios] = useState<Record<string, string>>({});
  const [editando, setEditando] = useState<{ fila: number; col: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  // Esc desmonta el textarea: algunos navegadores disparan blur al
  // desmontarlo, y ese blur no tiene que confirmar el valor cancelado.
  const cancelado = useRef(false);
  const hoja = workbook.hojas[hojaIdx];
  const editable = Boolean(onGuardar);
  const cantidadCambios = Object.keys(cambios).length;

  // Aviso del navegador si se intenta salir con cambios sin guardar.
  useEffect(() => {
    if (cantidadCambios === 0) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [cantidadCambios]);

  if (!hoja) {
    return <EmptyState title="Este archivo no tiene hojas para mostrar" />;
  }

  const hayVariasHojas = workbook.hojas.length > 1;
  const hojaVacia = hoja.filas.length === 0 || hoja.filas.every((f) => f.celdas.every((c) => c.tipo === "vacio"));

  const celdaEditable = (filaIdx: number, colIdx: number) => {
    const celda = hoja.filas[filaIdx]?.celdas[colIdx];
    return Boolean(celda && !celda.oculta && !celda.esFormula);
  };

  const confirmar = (filaIdx: number, colIdx: number, valor: string) => {
    const celda = hoja.filas[filaIdx].celdas[colIdx];
    const k = clave(hojaIdx, filaIdx, colIdx);
    setCambios((prev) => {
      const next = { ...prev };
      if (valor === textoOriginal(celda)) delete next[k];
      else next[k] = valor;
      return next;
    });
    setMensaje(null);
  };

  // Siguiente celda editable hacia abajo (Enter) o a la derecha (Tab),
  // salteando las tapadas por combinadas.
  const siguiente = (filaIdx: number, colIdx: number, direccion: "abajo" | "derecha") => {
    let f = filaIdx;
    let c = colIdx;
    for (let i = 0; i < 500; i++) {
      if (direccion === "abajo") f += 1;
      else c += 1;
      if (f >= hoja.filas.length || c >= hoja.anchosColumnasPx.length) return null;
      if (celdaEditable(f, c)) return { fila: f, col: c };
    }
    return null;
  };

  const guardar = () => {
    if (!onGuardar) return;
    const lista: CambioCeldaExcel[] = Object.entries(cambios).map(([k, valor]) => {
      const [h, f, c] = k.split(":").map(Number);
      return { hoja: workbook.hojas[h].nombre, fila: f + 1, columna: c + 1, valor };
    });
    startTransition(async () => {
      const r = await onGuardar(lista);
      if (r.ok) setCambios({});
      setMensaje({ ok: r.ok, texto: r.message });
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {hayVariasHojas && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {workbook.hojas.map((h, i) => (
            <button
              key={`${h.nombre}-${i}`}
              type="button"
              onClick={() => {
                setEditando(null);
                setHojaIdx(i);
              }}
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

      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-neutral-500">
            Tocá una celda para completarla. Enter baja a la siguiente, Tab avanza a la derecha.
          </p>
          <div className="flex items-center gap-2">
            {mensaje && (
              <span className={`text-sm ${mensaje.ok ? "text-secondary-700" : "text-error-600"}`}>{mensaje.texto}</span>
            )}
            {cantidadCambios > 0 && (
              <>
                <span className="text-sm text-neutral-600">
                  {cantidadCambios} {cantidadCambios === 1 ? "cambio" : "cambios"} sin guardar
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    setCambios({});
                    setEditando(null);
                  }}
                >
                  Descartar
                </Button>
                <Button type="button" size="sm" loading={pending} onClick={guardar}>
                  Guardar cambios
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {hojaVacia && !editable ? (
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
                  {fila.celdas.map((celda, colIdx) => {
                    if (celda.oculta) return null;
                    const k = clave(hojaIdx, filaIdx, colIdx);
                    const modificada = k in cambios;
                    const valor = modificada ? cambios[k] : textoOriginal(celda);
                    const sePuedeEditar = editable && !celda.esFormula;
                    const enEdicion = editando?.fila === filaIdx && editando?.col === colIdx;

                    return (
                      <td
                        key={colIdx}
                        colSpan={celda.colspan > 1 ? celda.colspan : undefined}
                        rowSpan={celda.rowspan > 1 ? celda.rowspan : undefined}
                        className={`relative whitespace-pre-wrap border border-neutral-100 px-2 py-1 align-top text-neutral-800 ${
                          sePuedeEditar ? "cursor-text hover:outline hover:outline-2 hover:-outline-offset-2 hover:outline-primary-200" : ""
                        } ${modificada ? "outline outline-2 -outline-offset-2 outline-warning-500" : ""}`}
                        style={estiloCelda(celda)}
                        onClick={sePuedeEditar && !enEdicion ? () => setEditando({ fila: filaIdx, col: colIdx }) : undefined}
                      >
                        {valor}
                        {enEdicion && (
                          <textarea
                            autoFocus
                            defaultValue={valor}
                            onFocus={(e) => e.currentTarget.select()}
                            onBlur={(e) => {
                              if (cancelado.current) {
                                cancelado.current = false;
                                return;
                              }
                              confirmar(filaIdx, colIdx, e.currentTarget.value);
                              setEditando((actual) =>
                                actual?.fila === filaIdx && actual?.col === colIdx ? null : actual,
                              );
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                e.preventDefault();
                                cancelado.current = true;
                                setEditando(null);
                              } else if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
                                e.preventDefault();
                                confirmar(filaIdx, colIdx, e.currentTarget.value);
                                setEditando(siguiente(filaIdx, colIdx, e.key === "Tab" ? "derecha" : "abajo"));
                              }
                            }}
                            className="absolute inset-0 z-10 h-full min-h-8 w-full resize-none bg-white px-2 py-1 text-sm text-neutral-900 outline outline-2 -outline-offset-2 outline-primary-500"
                            style={{ textAlign: estiloCelda(celda).textAlign }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
