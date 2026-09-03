"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularMontoCuotaSede } from "@/lib/pagos-calculo-server";
import type { FormState } from "@/lib/form-state";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MiB -- mismo límite que el bucket "comprobantes"

function extensionDe(nombre: string, tipo: string): string {
  const porNombre = nombre.split(".").pop();
  if (porNombre && porNombre.length <= 5) return porNombre.toLowerCase();
  return tipo === "application/pdf" ? "pdf" : "jpg";
}

// Sube un comprobante (imagen o PDF) como respaldo de una transferencia por
// alias/CBU -- es el único camino de pago (junto con efectivo registrado a
// mano por la admin) desde que se dejó de integrar Mercado Pago.
//
// El monto se recalcula acá server-side con la MISMA lógica que ya vio el
// alumno en /alumno/cuota (lib/alumno/cuota-data.ts): precio por actividad
// a su frecuencia real, combinado con el 20% off en la más cara si hace dos
// actividades distintas en esta sede, y prorrateado por mes calendario si
// es su primera cuota acá y se incorporó con el mes ya empezado -- nunca se
// confía en un monto mandado desde el cliente.
//
// Crea una fila NUEVA en pagos con estado='pendiente' (la RLS "alumno crea
// su intento de pago" ya permite exactamente esto) y medio='transferencia'
// -- queda a la vista de la admin, que la revisa y la aprueba o la rechaza
// (ver aprobarComprobante/rechazarComprobante en lib/admin/pagos-actions.ts).
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

  const calculo = await calcularMontoCuotaSede(supabase, user.id, sedeId);
  if (!calculo.ok) {
    return { status: "error", message: calculo.message };
  }
  const { monto, actividadesIds, frecuenciaSemanal, periodoMes } = calculo;

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
    actividades_ids: actividadesIds,
    periodo_mes: periodoMes,
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
