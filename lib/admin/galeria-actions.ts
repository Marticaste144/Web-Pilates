"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";
import type { TipoGaleriaItem } from "@/types/database";

const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];
const TIPOS_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const TAMANO_MAXIMO = 50 * 1024 * 1024; // 50 MiB -- de sobra para una foto, ajustado para clips cortos de ejercicios

function extensionDe(nombre: string, tipo: string): string {
  const porNombre = nombre.split(".").pop();
  return porNombre && porNombre.length <= 5 ? porNombre.toLowerCase() : tipo.split("/")[1] ?? "bin";
}

export async function subirGaleriaItem(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminProfile();

  const tipo = String(formData.get("tipo") ?? "") as TipoGaleriaItem;
  const titulo = String(formData.get("titulo") ?? "").trim();
  const archivo = formData.get("archivo");

  if (tipo !== "foto" && tipo !== "video") {
    return { status: "error", message: "Elegí si es una foto o un video." };
  }
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { status: "error", message: "Elegí un archivo para subir." };
  }

  const tiposPermitidos = tipo === "foto" ? TIPOS_FOTO : TIPOS_VIDEO;
  if (!tiposPermitidos.includes(archivo.type)) {
    return {
      status: "error",
      message: tipo === "foto" ? "Solo se aceptan imágenes JPG, PNG o WEBP." : "Solo se aceptan videos MP4, WEBM o MOV.",
    };
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return { status: "error", message: "El archivo pesa más de 50 MB." };
  }

  const supabase = await createClient();
  const path = `${crypto.randomUUID()}.${extensionDe(archivo.name, archivo.type)}`;

  const { error: errorUpload } = await supabase.storage
    .from("galeria")
    .upload(path, archivo, { contentType: archivo.type });

  if (errorUpload) {
    return { status: "error", message: `No se pudo subir el archivo: ${errorUpload.message}` };
  }

  const { error } = await supabase.from("galeria_items").insert({
    tipo,
    storage_path: path,
    titulo: titulo || null,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin/galeria");
  revalidatePath("/");
  return { status: "success", message: "Contenido agregado a la galería." };
}

export async function togglePublicadoGaleria(id: string, publicado: boolean): Promise<{ ok: boolean; message: string }> {
  await requireAdminProfile();

  const supabase = await createClient();
  const { error } = await supabase.from("galeria_items").update({ publicado }).eq("id", id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/galeria");
  revalidatePath("/");
  return { ok: true, message: publicado ? "Publicado." : "Despublicado." };
}

export async function eliminarGaleriaItem(id: string): Promise<{ ok: boolean; message: string }> {
  await requireAdminProfile();

  const supabase = await createClient();

  const { data: item } = await supabase.from("galeria_items").select("storage_path").eq("id", id).single();

  const { error } = await supabase.from("galeria_items").delete().eq("id", id);
  if (error) {
    return { ok: false, message: error.message };
  }

  if (item?.storage_path) {
    const { error: errorStorage } = await supabase.storage.from("galeria").remove([item.storage_path]);
    if (errorStorage) {
      console.error("[admin/galeria-actions] no se pudo borrar el archivo de Storage", errorStorage);
    }
  }

  revalidatePath("/admin/galeria");
  revalidatePath("/");
  return { ok: true, message: "Eliminado." };
}
