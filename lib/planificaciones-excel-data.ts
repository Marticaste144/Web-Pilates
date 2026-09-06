import { createClient } from "@/lib/supabase/server";
import { parsearWorkbookExcel, type WorkbookExcel } from "@/lib/planificaciones-excel";

const BUCKET = "planificaciones-excel";

export type ResultadoWorkbook =
  | { ok: true; workbook: WorkbookExcel }
  | { ok: false; motivo: "sin_archivo" | "storage" | "parseo"; message: string };

// Server-side: descarga el archivo del bucket privado (con el cliente de la
// SESIÓN del usuario, nunca el admin -- así RLS de storage.objects sigue
// siendo la autorización real, la misma que ya protege "planificaciones")
// y lo parsea. Al componente solo le llega el JSON ya armado (WorkbookExcel)
// -- nunca el archivo crudo ni una URL persistente.
export async function obtenerWorkbookDePlanificacion(archivoStoragePath: string): Promise<ResultadoWorkbook> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage.from(BUCKET).download(archivoStoragePath);

  if (error || !data) {
    console.error("[planificaciones-excel-data] no se pudo descargar el archivo", error);
    return { ok: false, motivo: "sin_archivo", message: "No se pudo acceder al archivo -- puede haberse eliminado o no tenés permiso." };
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const resultado = await parsearWorkbookExcel(buffer);

  if (!resultado.ok) {
    return { ok: false, motivo: "parseo", message: resultado.message };
  }

  return { ok: true, workbook: resultado.workbook };
}

export type ResultadoUrlDescarga = { ok: true; url: string } | { ok: false; message: string };

// Signed URL temporal (60s) para "Descargar Excel original" -- generada acá
// mismo con el cliente de la sesión, así la autorización para GENERARLA ya
// pasa por la misma RLS de storage.objects. Nunca se expone una URL pública
// permanente del archivo.
export async function generarUrlDescargaPlanificacion(archivoStoragePath: string): Promise<ResultadoUrlDescarga> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(archivoStoragePath, 60);

  if (error || !data?.signedUrl) {
    console.error("[planificaciones-excel-data] no se pudo generar el link de descarga", error);
    return { ok: false, message: "No se pudo generar el link de descarga -- puede que no tengas permiso o el archivo ya no exista." };
  }

  return { ok: true, url: data.signedUrl };
}
