import ExcelJS from "exceljs";
import JSZip from "jszip";

// Lee un .xlsx con ExcelJS y lo convierte a una estructura simple y segura
// para renderizar como spreadsheet dentro de MUV -- nunca se ejecuta nada
// del workbook (ni fórmulas, ni macros, ni contenido activo): ExcelJS solo
// PARSEA el archivo (no es un motor de cálculo), y acá además, si una celda
// es una fórmula, se toma el valor YA CALCULADO que Excel guardó en el
// archivo (cell.value.result) -- nunca se evalúa la fórmula nosotros. Si esa
// celda no trae un resultado cacheado (raro, pero posible), se muestra vacía
// en vez de intentar calcular nada.
//
// Prioridad explícita (pedido del bloque): LEGIBILIDAD + ESTRUCTURA, no
// fidelidad 100% idéntica a Excel -- por eso el manejo de formato numérico
// es deliberadamente simple (no se parsea numFmt en detalle).

export type TipoCelda = "texto" | "numero" | "fecha" | "booleano" | "vacio";

export type CeldaExcel = {
  valor: string | number | boolean | null;
  tipo: TipoCelda;
  negrita: boolean;
  cursiva: boolean;
  alineacion: "left" | "center" | "right" | null;
  colorFondo: string | null;
  colorTexto: string | null;
  bordes: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  /** Cuántas columnas ocupa (>1 si es el inicio de una celda combinada). */
  colspan: number;
  /** Cuántas filas ocupa (>1 si es el inicio de una celda combinada). */
  rowspan: number;
  /** true = esta celda está "tapada" por una combinada que empieza antes -- no se renderiza. */
  oculta: boolean;
};

export type FilaExcel = {
  /** Alto en px, ya convertido -- null si Excel no definió uno (se usa un alto por defecto). */
  altoPx: number | null;
  celdas: CeldaExcel[];
};

export type HojaExcel = {
  nombre: string;
  /** Anchos de columna en px, ya convertidos -- una entrada por columna. */
  anchosColumnasPx: number[];
  filas: FilaExcel[];
};

export type WorkbookExcel = {
  hojas: HojaExcel[];
};

const ANCHO_COLUMNA_DEFAULT = 64; // ~8.43 unidades Excel, el ancho por defecto
const ANCHO_COLUMNA_MIN = 40;
const ANCHO_COLUMNA_MAX = 400;
const ALTO_FILA_MIN = 20;
const MAX_FILAS_POR_HOJA = 2000;
const MAX_COLUMNAS_POR_HOJA = 200;

function anchoAPx(anchoExcel: number | undefined): number {
  const px = anchoExcel ? Math.round(anchoExcel * 7 + 5) : ANCHO_COLUMNA_DEFAULT;
  return Math.min(ANCHO_COLUMNA_MAX, Math.max(ANCHO_COLUMNA_MIN, px));
}

function altoAPx(altoPuntos: number | undefined): number | null {
  if (!altoPuntos) return null;
  return Math.max(ALTO_FILA_MIN, Math.round(altoPuntos * 1.333));
}

function argbACss(argb: string | undefined): string | null {
  if (!argb || argb.length < 6) return null;
  const hex = argb.length === 8 ? argb.slice(2) : argb;
  return `#${hex}`;
}

function esColorAutomatico(color: Partial<ExcelJS.Color> | undefined): boolean {
  // Sin argb explícito no hay un color CSS que se pueda armar de forma
  // confiable (theme/tint son índices de la paleta del archivo, no valores
  // de color directos) -- se trata como "sin color" en vez de adivinar.
  return !color || color.argb === undefined;
}

function tieneBorde(borde: Partial<ExcelJS.Border> | undefined): boolean {
  return Boolean(borde && borde.style);
}

// Convierte el valor "crudo" de ExcelJS (puede ser primitivo, Date, o un
// objeto especial de fórmula/richText/hipervínculo/error) a algo simple y
// seguro para mostrar. Nunca ejecuta la fórmula: si viene como objeto
// {formula, result}, usa result tal cual quedó guardado en el archivo.
function resolverValor(valorCrudo: ExcelJS.CellValue): { valor: CeldaExcel["valor"]; tipo: TipoCelda } {
  if (valorCrudo === null || valorCrudo === undefined) {
    return { valor: null, tipo: "vacio" };
  }

  if (valorCrudo instanceof Date) {
    return { valor: valorCrudo.toLocaleDateString("es-AR"), tipo: "fecha" };
  }

  if (typeof valorCrudo === "object") {
    if ("richText" in valorCrudo && Array.isArray(valorCrudo.richText)) {
      const texto = valorCrudo.richText.map((r) => r.text).join("");
      return { valor: texto, tipo: "texto" };
    }
    if ("formula" in valorCrudo) {
      const resultado = (valorCrudo as ExcelJS.CellFormulaValue).result;
      if (resultado === undefined) return { valor: null, tipo: "vacio" };
      if (resultado !== null && typeof resultado === "object" && "error" in resultado) {
        return { valor: String(resultado.error), tipo: "texto" };
      }
      return resolverValor(resultado as ExcelJS.CellValue);
    }
    if ("error" in valorCrudo) {
      return { valor: String(valorCrudo.error), tipo: "texto" };
    }
    if ("text" in valorCrudo) {
      // Hipervínculo {text, hyperlink} -- se muestra el texto, no el link
      // (no se navega a nada externo desde el visor).
      return { valor: String((valorCrudo as { text: unknown }).text), tipo: "texto" };
    }
    return { valor: String(valorCrudo), tipo: "texto" };
  }

  if (typeof valorCrudo === "number") return { valor: valorCrudo, tipo: "numero" };
  if (typeof valorCrudo === "boolean") return { valor: valorCrudo, tipo: "booleano" };
  return { valor: String(valorCrudo), tipo: "texto" };
}

function mapearCelda(cell: ExcelJS.Cell, esInicioDeMerge: { colspan: number; rowspan: number } | null, oculta: boolean): CeldaExcel {
  const { valor, tipo } = resolverValor(cell.value);

  const font = cell.font;
  const alignment = cell.alignment;
  const fill = cell.fill;
  const border = cell.border;

  let colorFondo: string | null = null;
  if (fill && fill.type === "pattern" && fill.pattern === "solid") {
    colorFondo = argbACss((fill.fgColor as Partial<ExcelJS.Color> | undefined)?.argb);
  }

  const colorTexto = font && !esColorAutomatico(font.color) ? argbACss(font.color?.argb) : null;

  let alineacion: CeldaExcel["alineacion"] = null;
  if (alignment?.horizontal === "left") alineacion = "left";
  else if (alignment?.horizontal === "center" || alignment?.horizontal === "centerContinuous") alineacion = "center";
  else if (alignment?.horizontal === "right") alineacion = "right";
  else if (tipo === "numero") alineacion = "right";

  return {
    valor,
    tipo,
    negrita: Boolean(font?.bold),
    cursiva: Boolean(font?.italic),
    alineacion,
    colorFondo,
    colorTexto,
    bordes: {
      top: tieneBorde(border?.top),
      bottom: tieneBorde(border?.bottom),
      left: tieneBorde(border?.left),
      right: tieneBorde(border?.right),
    },
    colspan: esInicioDeMerge?.colspan ?? 1,
    rowspan: esInicioDeMerge?.rowspan ?? 1,
    oculta,
  };
}

// Parsea un rango de merge tipo "B2:D4" a límites {row1,col1,row2,col2}.
function parsearRangoMerge(rango: string): { row1: number; col1: number; row2: number; col2: number } | null {
  const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(rango);
  if (!match) return null;
  const colALetra = (letras: string) => {
    let n = 0;
    for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n;
  };
  return {
    row1: Number(match[2]),
    col1: colALetra(match[1]),
    row2: Number(match[4]),
    col2: colALetra(match[3]),
  };
}

function parsearHoja(worksheet: ExcelJS.Worksheet): HojaExcel {
  const totalFilas = Math.min(worksheet.rowCount, MAX_FILAS_POR_HOJA);
  const totalColumnas = Math.min(Math.max(worksheet.columnCount, 1), MAX_COLUMNAS_POR_HOJA);

  const anchosColumnasPx: number[] = [];
  for (let c = 1; c <= totalColumnas; c++) {
    anchosColumnasPx.push(anchoAPx(worksheet.getColumn(c).width));
  }

  // Mapa de merges: inicio -> {colspan,rowspan}, y set de celdas "tapadas".
  const inicioMerge = new Map<string, { colspan: number; rowspan: number }>();
  const celdaOculta = new Set<string>();
  const rangosMerge: string[] = worksheet.model.merges ?? [];
  for (const rango of rangosMerge) {
    const limites = parsearRangoMerge(rango);
    if (!limites) continue;
    const { row1, col1, row2, col2 } = limites;
    inicioMerge.set(`${row1}:${col1}`, { colspan: col2 - col1 + 1, rowspan: row2 - row1 + 1 });
    for (let r = row1; r <= row2; r++) {
      for (let c = col1; c <= col2; c++) {
        if (r === row1 && c === col1) continue;
        celdaOculta.add(`${r}:${c}`);
      }
    }
  }

  const filas: FilaExcel[] = [];
  for (let r = 1; r <= totalFilas; r++) {
    const row = worksheet.getRow(r);
    const celdas: CeldaExcel[] = [];
    for (let c = 1; c <= totalColumnas; c++) {
      const clave = `${r}:${c}`;
      const oculta = celdaOculta.has(clave);
      celdas.push(mapearCelda(row.getCell(c), inicioMerge.get(clave) ?? null, oculta));
    }
    filas.push({ altoPx: altoAPx(row.height), celdas });
  }

  return { nombre: worksheet.name, anchosColumnasPx, filas };
}

// BUG REAL (causa del falso "archivo dañado"): exceljs@4.4.0 (la última
// versión estable -- verificado, no hay una más nueva que lo arregle) tira
// "Cannot read properties of undefined (reading 'anchors')" en
// XLSX.reconcile() al procesar CUALQUIER .xlsx que tenga una imagen
// incrustada (drawing) -- reproducido con un archivo mínimo generado por
// openpyxl con una sola imagen pegada en una celda. Es exactamente el caso
// real de una planificación con fotos de ejercicios pegadas en el Excel.
// El archivo NO está dañado -- es un bug conocido de la librería con
// drawings, no algo que se pueda evitar validando mejor el archivo de
// entrada. Como el visor de acá (ExcelViewer/CeldaExcel) nunca renderiza
// imágenes de todos modos (prioridad ya documentada: legibilidad/estructura,
// no fidelidad 100%), la solución real es sacar los drawings/imágenes del
// .xlsx ANTES de dárselo a exceljs -- así ni siquiera se llega al código con
// el bug, y se conserva absolutamente todo lo demás (valores, estilos,
// combinadas, anchos/altos).
async function quitarDrawingsDelXlsx(buffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);

  const rutasDrawingsYMedia = Object.keys(zip.files).filter(
    (ruta) => ruta.startsWith("xl/media/") || ruta.startsWith("xl/drawings/"),
  );
  if (rutasDrawingsYMedia.length === 0) return buffer; // sin drawings, no hay nada que tocar

  for (const ruta of rutasDrawingsYMedia) {
    zip.remove(ruta);
  }

  // Cada hoja referencia su drawing con <drawing r:id="rIdN"/> (siempre un
  // único tag autocontenido) -- se saca esa referencia y la relación
  // correspondiente en el .rels de la hoja, para que el XML quede
  // consistente (sin apuntar a un archivo que ya no existe).
  const rutasHojas = Object.keys(zip.files).filter((ruta) => /^xl\/worksheets\/sheet\d+\.xml$/.test(ruta));
  for (const rutaHoja of rutasHojas) {
    const archivoHoja = zip.file(rutaHoja);
    if (!archivoHoja) continue;

    const xmlHoja = await archivoHoja.async("string");
    if (xmlHoja.includes("<drawing")) {
      zip.file(rutaHoja, xmlHoja.replace(/<drawing\b[^>]*\/>/g, ""));
    }

    const rutaRels = rutaHoja.replace("xl/worksheets/", "xl/worksheets/_rels/") + ".rels";
    const archivoRels = zip.file(rutaRels);
    if (archivoRels) {
      const xmlRels = await archivoRels.async("string");
      const xmlRelsLimpio = xmlRels.replace(/<Relationship\b[^>]*Type="[^"]*\/drawing"[^>]*\/>/g, "");
      if (xmlRelsLimpio !== xmlRels) {
        zip.file(rutaRels, xmlRelsLimpio);
      }
    }
  }

  return zip.generateAsync({ type: "nodebuffer" });
}

export type ResultadoParseoExcel = { ok: true; workbook: WorkbookExcel } | { ok: false; message: string };

// Nunca lanza -- cualquier archivo corrupto/no soportado vuelve como
// {ok:false} con un mensaje claro para mostrar en vez de un error técnico
// crudo. No ejecuta macros/scripts: ExcelJS no tiene motor de VBA ni de
// fórmulas, solo lee la estructura y los valores/estilos guardados.
export async function parsearWorkbookExcel(buffer: Buffer): Promise<ResultadoParseoExcel> {
  try {
    const bufferSinDrawings = await quitarDrawingsDelXlsx(buffer);

    const workbook = new ExcelJS.Workbook();
    // exceljs/index.d.ts declara "declare interface Buffer extends ArrayBuffer
    // {}" -- un declaration merge contra el Buffer global que, combinado con
    // el @types/node moderno (Buffer<TArrayBuffer> genérico + ArrayBuffer con
    // los métodos nuevos de "resizable ArrayBuffer"), deja CUALQUIER
    // referencia a "Buffer" en todo el proyecto sin poder satisfacer el tipo
    // resultante -- es un conflicto entre las propias declaraciones de tipos
    // de terceros, no un problema real: en runtime esto es un Buffer válido
    // (Buffer.from ya lo garantiza). "any" puntual documentado, no un atajo.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ver comentario de arriba
    await workbook.xlsx.load(bufferSinDrawings as any);

    const hojas = workbook.worksheets.filter((ws) => ws.state !== "hidden" && ws.state !== "veryHidden").map(parsearHoja);

    if (hojas.length === 0) {
      return { ok: false, message: "El archivo no tiene ninguna hoja visible." };
    }

    return { ok: true, workbook: { hojas } };
  } catch (err) {
    console.error("[planificaciones-excel] no se pudo parsear el archivo", err);
    return { ok: false, message: "El archivo no es un Excel (.xlsx) válido o está dañado." };
  }
}
