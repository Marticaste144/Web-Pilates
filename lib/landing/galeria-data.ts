import { createClient } from "@/lib/supabase/server";
import type { TipoGaleriaItem } from "@/types/database";

export type GaleriaItemPublico = {
  id: string;
  tipo: TipoGaleriaItem;
  titulo: string | null;
  url: string;
};

// Público (landing sin sesión) -- lee de la vista v_galeria_publica, que ya
// filtra "publicado" y ordena (ver migración 20260901100000_galeria_publica.sql).
// Vacío (sin contenido real cargado todavía) es un estado normal: el front
// muestra "Próximamente" en ese caso, no un error.
export async function listarGaleriaPublica(): Promise<GaleriaItemPublico[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("v_galeria_publica").select("id, tipo, storage_path, titulo");

  if (error) {
    console.error("[landing/galeria-data] error leyendo v_galeria_publica", error);
    return [];
  }

  return (data ?? []).map((item): GaleriaItemPublico => ({
    id: item.id,
    tipo: item.tipo,
    titulo: item.titulo,
    url: supabase.storage.from("galeria").getPublicUrl(item.storage_path).data.publicUrl,
  }));
}
