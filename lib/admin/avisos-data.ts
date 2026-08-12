import { createClient } from "@/lib/supabase/server";

export type AvisoListItem = {
  id: string;
  titulo: string;
  mensaje: string;
  todasLasSedes: boolean;
  sedesNombres: string[];
  fechaInicio: string;
  fechaFin: string;
  createdAt: string;
};

export async function listarAvisos(): Promise<AvisoListItem[]> {
  const supabase = await createClient();

  const { data: avisos } = await supabase
    .from("avisos")
    .select("id, titulo, mensaje, todas_las_sedes, fecha_inicio, fecha_fin, created_at")
    .order("created_at", { ascending: false });

  if (!avisos || avisos.length === 0) return [];

  const { data: avisosSedes } = await supabase
    .from("avisos_sedes")
    .select("aviso_id, sede_id")
    .in(
      "aviso_id",
      avisos.map((a) => a.id),
    );

  const sedeIds = [...new Set((avisosSedes ?? []).map((a) => a.sede_id))];
  const { data: sedes } = sedeIds.length
    ? await supabase.from("sedes").select("id, nombre").in("id", sedeIds)
    : { data: [] };

  const sedeNombrePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  const sedesPorAviso = new Map<string, string[]>();
  for (const av of avisosSedes ?? []) {
    const nombre = sedeNombrePorId.get(av.sede_id);
    if (!nombre) continue;
    const lista = sedesPorAviso.get(av.aviso_id) ?? [];
    lista.push(nombre);
    sedesPorAviso.set(av.aviso_id, lista);
  }

  return avisos.map((a) => ({
    id: a.id,
    titulo: a.titulo,
    mensaje: a.mensaje,
    todasLasSedes: a.todas_las_sedes,
    sedesNombres: sedesPorAviso.get(a.id) ?? [],
    fechaInicio: a.fecha_inicio,
    fechaFin: a.fecha_fin,
    createdAt: a.created_at,
  }));
}
