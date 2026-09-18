"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { parsearWorkbookExcel } from "@/lib/planificaciones-excel";
import { obtenerPlanificacionPorId } from "@/lib/planificaciones-data";
import { generarUrlDescargaPlanificacion } from "@/lib/planificaciones-excel-data";
import { revalidarPlanificacion } from "@/lib/planificaciones-actions";
import type { TipoPlanificacion } from "@/types/database";

export type ExcelResult = { ok: boolean; message: string };

const BUCKET = "planificaciones-excel";
const EXTENSIONES_PERMITIDAS = [".xlsx"];
const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MiB -- mismo orden que "comprobantes"

// BUG REAL (causa de que un .xlsx genuino se rechazara): acá había una
// whitelist de archivo.type ("application/vnd.openxmlformats-...", más
// "application/octet-stream" como único extra) que rechazaba cualquier otro
// valor ANTES de llegar siquiera a intentar parsear el archivo. file.type lo
// arma el navegador/SO a partir de asociaciones de tipo de archivo que
// varían -- un Windows con la asociación de .xlsx rota/ausente puede mandar
// "application/vnd.ms-excel", "application/zip", "application/x-zip-
// compressed" o cualquier otra cosa para un .xlsx 100% real, y esa lista
// nunca los iba a cubrir a todos. La validación real de un .xlsx no es su
// MIME (que ni siquiera es un dato del archivo, es una adivinanza externa):
// es que (a) tenga la firma binaria real de un ZIP -- un .xlsx SIEMPRE es un
// ZIP, esto alcanza para descartar un archivo renombrado a mano (un .txt,
// una foto, etc.) -- y (b) que ExcelJS lo pueda parsear de verdad
// (parsearWorkbookExcel, más abajo). file.type ya no se usa para nada.
function tieneFirmaZip(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  const esZipLocal = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  const esZipVacio = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x05 && buffer[3] === 0x06;
  return esZipLocal || esZipVacio;
}

// Solo .xlsx (no .xls): ExcelJS no lee el formato binario viejo de Excel de
// forma confiable -- aceptar ".xls" sin poder parsearlo de verdad sería
// peor que no ofrecerlo. Validación server-side siempre, nunca se confía en
// lo que mande el navegador.
function validarArchivo(archivo: File, buffer: Buffer): { ok: true } | { ok: false; message: string } {
  if (archivo.size === 0) {
    return { ok: false, message: "El archivo está vacío." };
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return { ok: false, message: "El archivo pesa más de 10 MB." };
  }
  const nombre = archivo.name.toLowerCase();
  if (!EXTENSIONES_PERMITIDAS.some((ext) => nombre.endsWith(ext))) {
    return { ok: false, message: "Solo se aceptan archivos .xlsx." };
  }
  if (!tieneFirmaZip(buffer)) {
    return { ok: false, message: "El archivo no tiene el formato real de un .xlsx (puede estar renombrado o dañado)." };
  }
  return { ok: true };
}

async function subirYValidar(
  archivo: File,
  path: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();

  // Un solo arrayBuffer(): se reusa para la firma ZIP y para el parseo
  // completo de ExcelJS, en vez de leer el archivo dos veces.
  const buffer = Buffer.from(await archivo.arrayBuffer());

  const validacion = validarArchivo(archivo, buffer);
  if (!validacion.ok) return validacion;

  // Se PARSEA antes de subir -- si el archivo está corrupto o no es
  // realmente un .xlsx, se rechaza acá y nunca llega a ocupar espacio en
  // Storage ni a crear una fila en la base.
  const parseo = await parsearWorkbookExcel(buffer);
  if (!parseo.ok) return { ok: false, message: parseo.message };

  // BUG REAL (causa de fondo de "el sistema no permite completar la carga",
  // más allá de la validación de arriba): este upload sucede ANTES de que
  // exista la fila en "planificaciones" (a propósito, ver comentario de
  // cargarPlanificacionExcel). La policy de INSERT de storage.objects para
  // este bucket llegó a exigir fn_autoriza_archivo_planificacion(id) --que
  // busca esa fila-- así que SIEMPRE fallaba con "new row violates row-level
  // security policy", sin importar el archivo. Corregido en la migración
  // 20260920100000_fix_planificaciones_excel_upload_rls.sql (el INSERT ya no
  // depende de que la fila exista; el SELECT -- la autorización real de
  // lectura -- no cambió).
  const { error } = await supabase.storage.from(BUCKET).upload(path, archivo, {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  if (error) return { ok: false, message: `No se pudo subir el archivo: ${error.message}` };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Primera versión (individual o grupal). RLS ("profesor crea planificaciones
// ... autorizadas") exige creado_por = auth.uid() y que el alumno/clase sea
// propio -- mismo criterio que crearPlanificacion (estructurada). El archivo
// se sube ANTES del insert: si algo falla en el medio, no queda una fila
// "excel" sin archivo real detrás.
// ---------------------------------------------------------------------------
async function cargarPlanificacionExcel(
  tipo: TipoPlanificacion,
  owner: { alumnoId?: string; claseId?: string },
  formData: FormData,
): Promise<ExcelResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Iniciá sesión de nuevo." };

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File)) {
    return { ok: false, message: "Elegí un archivo .xlsx para subir." };
  }

  const titulo = String(formData.get("titulo") ?? "").trim() || null;

  // El id de la planificación lo generamos acá (no lo asigna Postgres al
  // insertar) porque el path de Storage necesita conocerlo ANTES del
  // insert -- convención: "<planificacion_id>/archivo.xlsx" (mismo criterio
  // documentado en la migración, evita colisiones sin depender del nombre
  // original, que se guarda aparte como metadata).
  const planificacionId = randomUUID();
  const path = `${planificacionId}/archivo.xlsx`;

  const subida = await subirYValidar(archivo, path);
  if (!subida.ok) return subida;

  const { error } = await supabase.from("planificaciones").insert({
    id: planificacionId,
    tipo,
    alumno_id: owner.alumnoId ?? null,
    clase_id: owner.claseId ?? null,
    es_actual: true,
    version: 1,
    creado_por: user.id,
    titulo,
    formato: "excel",
    archivo_storage_path: path,
    archivo_nombre_original: archivo.name,
  });

  if (error) {
    // El archivo ya se subió pero la fila no se pudo crear -- queda
    // huérfano en Storage (mismo criterio que otras subidas de este
    // proyecto, ej. fotos: no hay un mecanismo de limpieza automática, pero
    // tampoco representa una fila inconsistente en la base).
    return { ok: false, message: error.message };
  }

  await revalidarPlanificacion(owner.alumnoId ?? null, owner.claseId ?? null);
  return { ok: true, message: "Planificación cargada." };
}

export async function cargarPlanificacionExcelIndividual(alumnoId: string, formData: FormData): Promise<ExcelResult> {
  return cargarPlanificacionExcel("individual", { alumnoId }, formData);
}

export async function cargarPlanificacionExcelGrupal(claseId: string, formData: FormData): Promise<ExcelResult> {
  return cargarPlanificacionExcel("grupal", { claseId }, formData);
}

// ---------------------------------------------------------------------------
// Nueva versión: la actual pasa a es_actual=false (RLS ya la deja de solo
// lectura) y se crea una fila nueva con SU PROPIO archivo -- nunca se
// sobreescribe el archivo de la versión anterior (queda intacto en Storage,
// visitable desde el historial). Funciona igual si la versión anterior era
// "estructurada": simplemente esta nueva versión pasa a ser "excel" (no
// hace falta que todas las versiones de una misma planificación compartan
// formato -- cada una es su propia fila, con su propio formato).
// ---------------------------------------------------------------------------
export async function actualizarPlanificacionExcel(
  planificacionActualId: string,
  formData: FormData,
): Promise<ExcelResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Iniciá sesión de nuevo." };

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File)) {
    return { ok: false, message: "Elegí un archivo .xlsx para subir." };
  }

  const actual = await obtenerPlanificacionPorId(planificacionActualId);
  if (!actual || !actual.esActual) {
    return { ok: false, message: "Esta ya no es la versión actual." };
  }

  const titulo = String(formData.get("titulo") ?? "").trim() || null;

  const nuevoId = randomUUID();
  const path = `${nuevoId}/archivo.xlsx`;

  const subida = await subirYValidar(archivo, path);
  if (!subida.ok) return subida;

  // 1) La actual deja de serlo -- a partir de acá queda de solo lectura.
  const { error: errorViejaVersion } = await supabase
    .from("planificaciones")
    .update({ es_actual: false })
    .eq("id", actual.id);

  if (errorViejaVersion) {
    return { ok: false, message: errorViejaVersion.message };
  }

  const { error: errorNueva } = await supabase.from("planificaciones").insert({
    id: nuevoId,
    tipo: actual.tipo,
    alumno_id: actual.alumnoId,
    clase_id: actual.claseId,
    es_actual: true,
    version: actual.version + 1,
    version_anterior_id: actual.id,
    creado_por: user.id,
    titulo: titulo ?? actual.titulo,
    formato: "excel",
    archivo_storage_path: path,
    archivo_nombre_original: archivo.name,
  });

  if (errorNueva) {
    return {
      ok: false,
      message: `No se pudo crear la nueva versión (la anterior ya quedó archivada): ${errorNueva.message}`,
    };
  }

  await revalidarPlanificacion(actual.alumnoId, actual.claseId);
  return { ok: true, message: "Nueva versión cargada." };
}

export type DescargaResult = { ok: true; url: string } | { ok: false; message: string };

// Server Action invocable desde el cliente (el botón "Descargar") -- vuelve
// a leer la fila con obtenerPlanificacionPorId (mismo cliente con sesión,
// misma RLS) para no confiar en un path que mande el propio cliente: si esa
// planificación no es "excel", o el usuario no está autorizado a verla, no
// hay archivo que descargar.
export async function obtenerUrlDescargaExcel(planificacionId: string): Promise<DescargaResult> {
  const plan = await obtenerPlanificacionPorId(planificacionId);

  if (!plan || plan.formato !== "excel" || !plan.archivoStoragePath) {
    return { ok: false, message: "No se encontró el archivo de esta planificación." };
  }

  const resultado = await generarUrlDescargaPlanificacion(plan.archivoStoragePath);
  if (!resultado.ok) return { ok: false, message: resultado.message };
  return { ok: true, url: resultado.url };
}
