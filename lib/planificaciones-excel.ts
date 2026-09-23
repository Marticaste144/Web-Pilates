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
  /** true = la celda es una fórmula -- no se deja editar (se mostraría un valor cacheado viejo). */
  esFormula: boolean;
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
    if ("formula" in valorCrudo || "sharedFormula" in valorCrudo) {
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
    esFormula:
      cell.value !== null && typeof cell.value === "object" && ("formula" in cell.value || "sharedFormula" in cell.value),
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

// ---------------------------------------------------------------------------
// Edición de celdas ("completar" la planificación desde la web).
//
// No se reescribe el archivo con ExcelJS: además del bug con drawings de
// arriba, ExcelJS al guardar pierde imágenes y parte del formato. Acá se
// edita el XML de la hoja directamente (JSZip) tocando SOLO las celdas
// cambiadas -- todo lo demás del .xlsx (fotos de ejercicios, estilos,
// combinadas, otras hojas) queda byte por byte igual. Cada celda editada
// conserva su estilo (atributo s=); el valor nuevo va como número si parece
// un número, o como texto inline si no.
// ---------------------------------------------------------------------------

export type CambioCeldaExcel = {
  /** Nombre de la hoja (único dentro de un .xlsx). */
  hoja: string;
  /** Fila 1-based, como en Excel. */
  fila: number;
  /** Columna 1-based, como en Excel (1 = A). */
  columna: number;
  valor: string;
};

function columnaALetras(columna: number): string {
  let letras = "";
  let n = columna;
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
}

function letrasAColumna(letras: string): number {
  let n = 0;
  for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function desescaparXml(texto: string): string {
  return texto
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function atributo(tag: string, nombre: string): string | null {
  const match = new RegExp(`\\s${nombre}="([^"]*)"`).exec(tag);
  return match ? match[1] : null;
}

function armarCeldaXml(ref: string, estilo: string | null, valor: string): string {
  const s = estilo !== null ? ` s="${estilo}"` : "";
  const limpio = valor.trim();
  if (limpio === "") return `<c r="${ref}"${s}/>`;
  if (/^-?\d+([.,]\d+)?$/.test(limpio)) {
    return `<c r="${ref}"${s}><v>${limpio.replace(",", ".")}</v></c>`;
  }
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escaparXml(valor)}</t></is></c>`;
}

// Regex de celdas dentro de una fila: <c .../> o <c ...>...</c> (las celdas
// nunca se anidan, así que el no-greedy alcanza).
const REGEX_CELDA = /<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g;
const REGEX_FILA = /<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g;

function aplicarCambioEnFila(filaXml: string, ref: string, columna: number, valor: string): string {
  const autocerrada = /\/>$/.test(filaXml) && !filaXml.includes("</row>");
  const apertura = autocerrada ? filaXml.slice(0, -2) + ">" : filaXml.slice(0, filaXml.indexOf(">") + 1);
  const contenido = autocerrada ? "" : filaXml.slice(apertura.length, filaXml.lastIndexOf("</row>"));

  const celdas = contenido.match(REGEX_CELDA) ?? [];
  const existente = celdas.find((c) => atributo(c.slice(0, c.indexOf(">") + 1), "r") === ref);

  if (existente) {
    const tagApertura = existente.slice(0, existente.indexOf(">") + 1);
    const nueva = armarCeldaXml(ref, atributo(tagApertura, "s"), valor);
    return apertura + contenido.replace(existente, () => nueva) + "</row>";
  }

  // La celda no existe en el XML (vacía y sin formato): se inserta en orden
  // de columna -- Excel exige que las celdas de una fila estén ordenadas.
  // Si la fila tiene un estilo propio (customFormat), la celda nueva lo hereda.
  const estiloFila = atributo(apertura, "customFormat") === "1" ? atributo(apertura, "s") : null;
  const nueva = armarCeldaXml(ref, estiloFila, valor);
  const siguiente = celdas.find((c) => {
    const r = atributo(c.slice(0, c.indexOf(">") + 1), "r");
    const letras = r ? /^([A-Z]+)/.exec(r)?.[1] : null;
    return letras ? letrasAColumna(letras) > columna : false;
  });
  const nuevoContenido = siguiente ? contenido.replace(siguiente, () => nueva + siguiente) : contenido + nueva;
  return apertura + nuevoContenido + "</row>";
}

function aplicarCambiosEnHoja(xmlHoja: string, cambios: CambioCeldaExcel[]): string {
  let xml = xmlHoja;
  // <sheetData/> vacío -> se abre para poder insertar filas.
  xml = xml.replace(/<sheetData\s*\/>/, "<sheetData></sheetData>");

  for (const cambio of cambios) {
    const ref = `${columnaALetras(cambio.columna)}${cambio.fila}`;
    const inicioData = xml.indexOf("<sheetData");
    const aperturaData = xml.indexOf(">", inicioData) + 1;
    const cierreData = xml.indexOf("</sheetData>");
    if (inicioData === -1 || cierreData === -1) throw new Error("La hoja no tiene <sheetData>.");

    const data = xml.slice(aperturaData, cierreData);
    const filas = data.match(REGEX_FILA) ?? [];
    const fila = filas.find((f) => atributo(f.slice(0, f.indexOf(">") + 1), "r") === String(cambio.fila));

    let nuevaData: string;
    if (fila) {
      nuevaData = data.replace(fila, () => aplicarCambioEnFila(fila, ref, cambio.columna, cambio.valor));
    } else {
      if (cambio.valor.trim() === "") continue; // borrar algo que no existe: nada que hacer
      const nuevaFila = `<row r="${cambio.fila}">${armarCeldaXml(ref, null, cambio.valor)}</row>`;
      const siguiente = filas.find((f) => Number(atributo(f.slice(0, f.indexOf(">") + 1), "r")) > cambio.fila);
      nuevaData = siguiente ? data.replace(siguiente, () => nuevaFila + siguiente) : data + nuevaFila;
    }
    xml = xml.slice(0, aperturaData) + nuevaData + xml.slice(cierreData);
  }
  return xml;
}

// Resuelve nombre de hoja -> ruta del XML dentro del zip, vía workbook.xml
// (<sheet name r:id>) + workbook.xml.rels (<Relationship Id Target>).
async function rutasDeHojas(zip: JSZip): Promise<Map<string, string>> {
  const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  if (!workbookXml || !relsXml) throw new Error("Estructura de .xlsx inesperada.");

  const targets = new Map<string, string>();
  for (const rel of relsXml.match(/<Relationship\b[^>]*\/?>/g) ?? []) {
    const id = atributo(rel, "Id");
    const target = atributo(rel, "Target");
    if (id && target) {
      targets.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target}`);
    }
  }

  const rutas = new Map<string, string>();
  for (const sheet of workbookXml.match(/<sheet\b[^>]*\/?>/g) ?? []) {
    const nombre = atributo(sheet, "name");
    const rid = atributo(sheet, "r:id");
    const ruta = rid ? targets.get(rid) : undefined;
    if (nombre !== null && ruta) rutas.set(desescaparXml(nombre), ruta);
  }
  return rutas;
}

export type ResultadoEdicionExcel = { ok: true; buffer: Buffer } | { ok: false; message: string };

export async function aplicarCambiosAlXlsx(buffer: Buffer, cambios: CambioCeldaExcel[]): Promise<ResultadoEdicionExcel> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const rutas = await rutasDeHojas(zip);

    const porHoja = new Map<string, CambioCeldaExcel[]>();
    for (const cambio of cambios) {
      const lista = porHoja.get(cambio.hoja) ?? [];
      lista.push(cambio);
      porHoja.set(cambio.hoja, lista);
    }

    for (const [hoja, cambiosHoja] of porHoja) {
      const ruta = rutas.get(hoja);
      const archivo = ruta ? zip.file(ruta) : null;
      if (!ruta || !archivo) return { ok: false, message: `No se encontró la hoja "${hoja}" en el archivo.` };
      const xml = await archivo.async("string");
      zip.file(ruta, aplicarCambiosEnHoja(xml, cambiosHoja));
    }

    // Que Excel recalcule las fórmulas al abrir (ej. totales que dependen de
    // las celdas completadas) -- acá nunca se calcula nada.
    const workbookXml = await zip.file("xl/workbook.xml")!.async("string");
    if (/<calcPr\b/.test(workbookXml) && !/fullCalcOnLoad=/.test(workbookXml)) {
      zip.file("xl/workbook.xml", workbookXml.replace(/<calcPr\b/, '<calcPr fullCalcOnLoad="1"'));
    }

    const nuevo = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    return { ok: true, buffer: nuevo };
  } catch (err) {
    console.error("[planificaciones-excel] no se pudieron aplicar los cambios", err);
    return { ok: false, message: "No se pudieron guardar los cambios en el archivo." };
  }
}

export type ResultadoParseoExcel ={ ok: true; workbook: WorkbookExcel } | { ok: false; message: string };

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
