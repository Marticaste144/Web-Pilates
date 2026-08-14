import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { listarAlumnosParaExportar } from "@/lib/admin/export-data";
import { aCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

function formatearFecha(fechaIso: string | null): string | null {
  if (!fechaIso) return null;
  return new Date(`${fechaIso}T00:00:00`).toLocaleDateString("es-AR");
}

// GET (no Server Action) por el mismo motivo que el PDF de asistencias: un
// link de descarga simple, sin JS extra del lado del cliente.
export async function GET() {
  await requireRole("admin");

  const filas = await listarAlumnosParaExportar();

  const csv = aCsv(
    ["Nombre", "Apellido", "Email", "Teléfono", "Sede", "Estado de cuota", "Vencimiento", "Monto"],
    filas.map((f) => [
      f.nombre,
      f.apellido,
      f.email,
      f.telefono,
      f.sedeNombre,
      f.estadoCuota,
      formatearFecha(f.vencimiento),
      f.monto,
    ]),
  );

  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="alumnos-muv-${fecha}.csv"`,
    },
  });
}
