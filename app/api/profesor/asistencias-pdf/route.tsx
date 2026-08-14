import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireRole } from "@/lib/auth/session";
import { obtenerAsistenciasSemana } from "@/lib/profesor/asistencias-pdf-data";
import { AsistenciasPdfDocument } from "@/lib/profesor/asistencias-pdf";
import { hoyISO } from "@/lib/fecha";

export const dynamic = "force-dynamic";

// GET en vez de Server Action a propósito: un botón/link de descarga con
// ?fecha=... es lo más simple para que el navegador maneje el PDF (guardar/
// abrir) sin JS extra del lado del cliente. requireRole ya redirige solo si
// no hay sesión de profesor -- misma protección que cualquier página.
export async function GET(request: NextRequest) {
  const perfil = await requireRole("profesor");

  const fechaParam = request.nextUrl.searchParams.get("fecha");
  const fecha = fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) ? fechaParam : hoyISO();

  const data = await obtenerAsistenciasSemana(fecha);

  const buffer = await renderToBuffer(<AsistenciasPdfDocument data={data} />);

  const nombreArchivo = `asistencias-${perfil.apellido.toLowerCase().replace(/\s+/g, "-")}-${data.lunes}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
