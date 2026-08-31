import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { listarAlumnosParaExportar } from "@/lib/admin/export-data";
import { aXlsxBuffer, XLSX_CONTENT_TYPE } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

// GET (no Server Action) por el mismo motivo que el PDF de asistencias: un
// link de descarga simple, sin JS extra del lado del cliente.
export async function GET() {
  await requireRole("admin");

  const filas = await listarAlumnosParaExportar();

  const buffer = await aXlsxBuffer(
    [
      { header: "Nombre", key: "nombre", width: 20 },
      { header: "Apellido", key: "apellido", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Teléfono", key: "telefono", width: 16 },
      { header: "Sede", key: "sede", width: 18 },
      { header: "Estado de cuota", key: "estadoCuota", width: 18 },
      { header: "Vencimiento", key: "vencimiento", width: 16, numFmt: "dd/mm/yyyy" },
      { header: "Monto", key: "monto", width: 16, numFmt: '"$" #,##0.00' },
    ],
    filas.map((f) => ({
      nombre: f.nombre,
      apellido: f.apellido,
      email: f.email,
      telefono: f.telefono ?? "",
      sede: f.sedeNombre,
      estadoCuota: f.estadoCuota,
      vencimiento: f.vencimiento ? new Date(`${f.vencimiento}T00:00:00`) : null,
      monto: f.monto,
    })),
  );

  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="alumnos-muv-${fecha}.xlsx"`,
    },
  });
}
