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
const MIME_PERMITIDOS = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Algunos navegadores/SO mandan esto para .xlsx -- se acepta igual SIEMPRE
  // que la extensión sea .xlsx (el parseo real de ExcelJS es la validación
  // que de verdad importa, esto es solo un primer filtro barato).
  "application/octet-stream",
];
const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MiB -- mismo orden que "comprobantes"

// Solo .xlsx (no .xls): ExcelJS no lee el formato binario viejo de Excel de
// forma confiable -- aceptar ".xls" sin poder parsearlo de verdad sería
// peor que no ofrecerlo. Validación server-side siempre, nunca se confía en
// lo que mande el navegador.
function validarArchivo(archivo: File): { ok: true } | { ok: false; message: string } {
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
  if (archivo.type && !MIME_PERMITIDOS.includes(archivo.type)) {
    return { ok: false, message: "El archivo no parece ser un Excel (.xlsx) válido." };
  }
  return { ok: true };
}

async function subirYValidar(
  archivo: File,
  path: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();

  const validacion = validarArchivo(archivo);
  if (!validacion.ok) return validacion;

  // Se PARSEA antes de subir -- si el archivo está corrupto o no es
  // realmente un .xlsx, se rechaza acá y nunca llega a ocupar espacio en
  // Storage ni a crear una fila en la base.
  const buffer = Buffer.from(await archivo.arrayBuffer());
  const parseo = await parsearWorkbookExcel(buffer);
  if (!parseo.ok) return { ok: false, message: parseo.message };

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
