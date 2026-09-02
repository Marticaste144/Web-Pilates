import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { obtenerClaseDetalle } from "@/lib/profesor/clases-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";

const ESTADO_LABEL: Record<string, string> = {
  presente: "Presente",
  ausente: "Ausente",
};

// La misma RLS que protege obtenerClaseDetalle (usada en la pantalla) protege
// este endpoint: un profesor que pide el id de una clase ajena recibe un
// roster vacío (inscripciones/asistencias de esa clase no le pertenecen), no
// un error -- así que no hace falta chequear profesor_id acá aparte.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fechaParam = request.nextUrl.searchParams.get("fecha") ?? undefined;

  // Sin ?fecha=, misma resolución por defecto que usa la pantalla (última
  // ocurrencia real del día que dicta la clase, no "hoy" a secas).
  const clase = await obtenerClaseDetalle(id, fechaParam);
  if (!clase) {
    return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });
  }
  const fecha = clase.fecha;

  const diaLabel = DIAS_SEMANA.find((d) => d.value === clase.diaSemana)?.label ?? String(clase.diaSemana);

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4 en puntos
  const pageHeight = 841.89;
  const marginX = 50;
  let y = pageHeight - 60;
  let page = pdf.addPage([pageWidth, pageHeight]);

  const drawText = (text: string, x: number, yPos: number, size: number, bold = false) => {
    page.drawText(text, { x, y: yPos, size, font: bold ? fontBold : font, color: rgb(0.1, 0.1, 0.1) });
  };

  drawText(`Asistencia -- ${clase.sedeNombre}`, marginX, y, 16, true);
  y -= 22;
  drawText(
    `${diaLabel} ${clase.horaInicio.slice(0, 5)} - ${clase.horaFin.slice(0, 5)}  |  Fecha: ${fecha}`,
    marginX,
    y,
    11,
  );
  y -= 30;

  const colApellido = marginX;
  const colNombre = marginX + 180;
  const colEstado = marginX + 360;

  drawText("Apellido", colApellido, y, 10, true);
  drawText("Nombre", colNombre, y, 10, true);
  drawText("Asistencia", colEstado, y, 10, true);
  y -= 6;
  page.drawLine({
    start: { x: marginX, y },
    end: { x: pageWidth - marginX, y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 18;

  for (const alumno of clase.roster) {
    if (y < 60) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - 60;
    }
    drawText(alumno.apellido, colApellido, y, 10);
    drawText(alumno.nombre, colNombre, y, 10);
    drawText(ESTADO_LABEL[alumno.asistenciaEstado ?? ""] ?? "Sin marcar", colEstado, y, 10);
    y -= 20;
  }

  if (clase.roster.length === 0) {
    drawText("Todavía no hay nadie anotado en esta clase.", colApellido, y, 10);
    y -= 20;
  }

  if (clase.alumnosNoVisibles > 0) {
    y -= 10;
    drawText(
      `Hay ${clase.alumnosNoVisibles} alumno(s) más anotado(s) en esta clase que todavía no aparecen`,
      marginX,
      y,
      9,
    );
    y -= 13;
    drawText("porque no tienen ninguna cuota aprobada.", marginX, y, 9);
  }

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="asistencia-${fecha}.pdf"`,
    },
  });
}
