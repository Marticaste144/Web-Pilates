// Generación de .xlsx real (no CSV) para las exportaciones de la vista
// admin. El CSV separado por comas se abría en una sola columna en Excel en
// español (que espera ";" como separador de campo) -- un .xlsx no depende
// del separador regional del usuario.
import ExcelJS from "exceljs";

export type ColumnaExcel = {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
};

const ENCABEZADO_FONDO = "FF0F172A"; // neutral-900, mismo tono oscuro que el resto de la UI
const ENCABEZADO_TEXTO = "FFFFFFFF";

export async function aXlsxBuffer(
  columnas: ColumnaExcel[],
  filas: Record<string, unknown>[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet("Datos", {
    views: [{ state: "frozen", ySplit: 1 }], // fila de encabezado congelada
  });

  hoja.columns = columnas.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));

  const filaEncabezado = hoja.getRow(1);
  filaEncabezado.font = { bold: true, color: { argb: ENCABEZADO_TEXTO } };
  filaEncabezado.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ENCABEZADO_FONDO } };

  for (const fila of filas) {
    const row = hoja.addRow(fila);
    columnas.forEach((c, idx) => {
      if (c.numFmt) row.getCell(idx + 1).numFmt = c.numFmt;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
