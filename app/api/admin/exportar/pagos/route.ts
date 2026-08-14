import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { listarPagosParaExportar } from "@/lib/admin/export-data";
import { aCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

function formatearFechaHora(fechaIso: string): string {
  return new Date(fechaIso).toLocaleString("es-AR");
}

// GET (no Server Action), mismo criterio que /api/admin/exportar/alumnos.
export async function GET() {
  await requireRole("admin");

  const filas = await listarPagosParaExportar();

  const csv = aCsv(
    ["Fecha", "Alumno", "Email", "Sede", "Monto", "Medio", "Estado"],
    filas.map((f) => [
      formatearFechaHora(f.fecha),
      f.alumnoNombre,
      f.alumnoEmail,
      f.sedeNombre,
      f.monto,
      f.medio,
      f.estado,
    ]),
  );

  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pagos-muv-${fecha}.csv"`,
    },
  });
}
