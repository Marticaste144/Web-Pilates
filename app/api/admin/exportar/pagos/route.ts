import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { listarPagosParaExportar } from "@/lib/admin/export-data";
import { aXlsxBuffer, XLSX_CONTENT_TYPE } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

// GET (no Server Action), mismo criterio que /api/admin/exportar/alumnos.
export async function GET() {
  await requireRole("admin");

  const filas = await listarPagosParaExportar();

  const buffer = await aXlsxBuffer(
    [
      { header: "Fecha", key: "fecha", width: 20, numFmt: "dd/mm/yyyy hh:mm" },
      { header: "Alumno", key: "alumno", width: 28 },
      { header: "Email", key: "email", width: 30 },
      { header: "Sede", key: "sede", width: 18 },
      { header: "Monto", key: "monto", width: 16, numFmt: '"$" #,##0.00' },
      { header: "Medio", key: "medio", width: 16 },
      { header: "Estado", key: "estado", width: 16 },
    ],
    filas.map((f) => ({
      fecha: new Date(f.fecha),
      alumno: f.alumnoNombre,
      email: f.alumnoEmail,
      sede: f.sedeNombre,
      monto: f.monto,
      medio: f.medio,
      estado: f.estado,
    })),
  );

  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="pagos-muv-${fecha}.xlsx"`,
    },
  });
}
