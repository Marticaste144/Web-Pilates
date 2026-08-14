"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MiB -- mismo límite que el bucket "comprobantes"

function extensionDe(nombre: string, tipo: string): string {
  const porNombre = nombre.split(".").pop();
  if (porNombre && porNombre.length <= 5) return porNombre.toLowerCase();
  return tipo === "application/pdf" ? "pdf" : "jpg";
}

// Sube un comprobante (imagen o PDF) como respaldo de una transferencia por
// alias/CBU -- NO reemplaza al flujo de Mercado Pago (esa cuota se sigue
// aprobando sola por el webhook) ni pisa nada de lib/alumno/pago-actions.ts,
// a propósito: es un camino totalmente aparte, para no arriesgar el flujo
// de pagos que ya funciona.
//
// Crea una fila NUEVA en pagos con estado='pendiente' (la RLS "alumno crea
// su intento de pago" ya permite exactamente esto) y medio='transferencia'
// -- queda a la vista de la admin, que la revisa y la aprueba o la rechaza
// (ver aprobarComprobante/rechazarComprobante en lib/admin/pagos-actions.ts).
// Sin recargo: a diferencia de medio='mercadopago', acá "monto" es
// exactamente lo que se le pide transferir al alumno (ver
// lib/configuracion-pagos.ts).
//
// El archivo se sube ANTES de insertar la fila (no al revés): si la subida
// falla, no queda ninguna fila "pendiente" húerfana sin comprobante -- y el
// alumno no tiene permiso para borrar sus propios pagos (RLS a propósito,
// ver migración del paso 3), así que un rollback manual no sería posible.
export async function subirComprobantePago(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Iniciá sesión de nuevo." };
  }

  const sedeId = String(formData.get("sede_id") ?? "");
  const archivo = formData.get("comprobante");

  if (!sedeId || !(archivo instanceof File) || archivo.size === 0) {
    return { status: "error", message: "Elegí un archivo para subir." };
  }
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return { status: "error", message: "Solo se aceptan imágenes (JPG/PNG/WEBP) o PDF." };
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return { status: "error", message: "El archivo pesa más de 10 MB." };
  }

  // Frecuencia semanal = clases activas reales del alumno en esta sede --
  // mismo criterio que iniciarPagoMercadoPago (lib/alumno/pago-actions.ts),
  // duplicado a propósito acá en vez de compartido, ver comentario arriba.
  const { data: inscripciones } = await supabase.from("inscripciones").select("clase_id").eq("estado", "activa");

  const claseIds = [...new Set((inscripciones ?? []).map((i) => i.clase_id))];
  if (claseIds.length === 0) {
    return { status: "error", message: "No tenés clases activas en ninguna sede." };
  }

  const { data: clases } = await supabase.from("clases").select("id, sede_id").in("id", claseIds);
  const frecuenciaSemanal = (clases ?? []).filter((c) => c.sede_id === sedeId).length;

  if (frecuenciaSemanal === 0) {
    return { status: "error", message: "No tenés clases activas en esta sede." };
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const { data: arancelRows } = await supabase
    .from("aranceles")
    .select("valor_mensual, vigente_desde")
    .eq("sede_id", sedeId)
    .eq("clases_por_semana", frecuenciaSemanal)
    .lte("vigente_desde", hoy)
    .order("vigente_desde", { ascending: false })
    .limit(1);

  const monto = arancelRows?.[0]?.valor_mensual;
  if (!monto) {
    return { status: "error", message: "No hay un arancel definido para esta frecuencia todavía." };
  }

  const pagoId = randomUUID();
  const path = `${user.id}/${pagoId}.${extensionDe(archivo.name, archivo.type)}`;

  const { error: errorUpload } = await supabase.storage
    .from("comprobantes")
    .upload(path, archivo, { contentType: archivo.type });

  if (errorUpload) {
    return { status: "error", message: `No se pudo subir el archivo: ${errorUpload.message}` };
  }

  const { error: errorInsert } = await supabase.from("pagos").insert({
    id: pagoId,
    alumno_id: user.id,
    sede_id: sedeId,
    frecuencia_semanal: frecuenciaSemanal,
    monto,
    medio: "transferencia",
    estado: "pendiente",
    comprobante_url: path,
  });

  if (errorInsert) {
    return { status: "error", message: errorInsert.message };
  }

  revalidatePath("/alumno/cuota");
  return { status: "success", message: "Comprobante subido -- la administración lo va a revisar." };
}
