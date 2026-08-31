"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MiB -- mismo límite que el bucket "rutinas"

function extensionDe(nombre: string, tipo: string): string {
  const porNombre = nombre.split(".").pop();
  if (porNombre && porNombre.length <= 5) return porNombre.toLowerCase();
  return tipo === "application/pdf" ? "pdf" : "jpg";
}

// Guarda la rutina del profesor logueado (texto y/o archivo) -- por RLS
// ("profesor gestiona su propia rutina") solo puede tocar su propia fila,
// sin importar qué profesor_id se intente mandar, así que ni hace falta
// pasarlo por parámetro. Un archivo nuevo pisa siempre al mismo path (nombre
// fijo "rutina.<ext>"), así no queda basura acumulada de subidas viejas.
export async function guardarRutina(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Iniciá sesión de nuevo." };
  }

  const contenido = String(formData.get("contenido") ?? "").trim();
  const archivo = formData.get("archivo");

  const datos: { profesor_id: string; contenido: string | null; archivo_url?: string; archivo_nombre?: string } = {
    profesor_id: user.id,
    contenido: contenido || null,
  };

  if (archivo instanceof File && archivo.size > 0) {
    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      return { status: "error", message: "Solo se aceptan imágenes (JPG/PNG/WEBP) o PDF." };
    }
    if (archivo.size > TAMANO_MAXIMO) {
      return { status: "error", message: "El archivo pesa más de 10 MB." };
    }

    const path = `${user.id}/rutina.${extensionDe(archivo.name, archivo.type)}`;
    const { error: errorUpload } = await supabase.storage
      .from("rutinas")
      .upload(path, archivo, { contentType: archivo.type, upsert: true });

    if (errorUpload) {
      return { status: "error", message: `No se pudo subir el archivo: ${errorUpload.message}` };
    }

    datos.archivo_url = path;
    datos.archivo_nombre = archivo.name;
  }

  const { error } = await supabase.from("rutinas_profesor").upsert(datos, { onConflict: "profesor_id" });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath(`/profesor/equipo/${user.id}`);
  return { status: "success", message: "Rutina guardada." };
}
