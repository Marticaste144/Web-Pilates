import { createClient } from "@/lib/supabase/server";
import type { TipoGaleriaItem } from "@/types/database";

export type GaleriaItemAdmin = {
  id: string;
  tipo: TipoGaleriaItem;
  titulo: string | null;
  orden: number;
  publicado: boolean;
  storagePath: string;
  url: string;
  createdAt: string;
};

// A diferencia de la vista pública (v_galeria_publica), acá se listan TODOS
// los items -- publicados o no -- para que la admin pueda revisar/despublicar
// antes de que algo salga a la landing.
export async function listarGaleriaAdmin(): Promise<GaleriaItemAdmin[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("galeria_items")
    .select("id, tipo, titulo, orden, publicado, storage_path, created_at")
    .order("orden")
    .order("created_at");

  if (error) {
    console.error("[admin/galeria-data] error leyendo galeria_items", error);
    return [];
  }

  return (data ?? []).map((item): GaleriaItemAdmin => ({
    id: item.id,
    tipo: item.tipo,
    titulo: item.titulo,
    orden: item.orden,
    publicado: item.publicado,
    storagePath: item.storage_path,
    url: supabase.storage.from("galeria").getPublicUrl(item.storage_path).data.publicUrl,
    createdAt: item.created_at,
  }));
}
