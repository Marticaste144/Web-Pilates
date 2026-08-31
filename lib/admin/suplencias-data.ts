import { createClient } from "@/lib/supabase/server";

export type SuplenciaItem = {
  id: string;
  profesorOriginalNombre: string;
  profesorSuplenteNombre: string;
  fechaInicio: string;
  fechaFin: string | null;
  activa: boolean;
};

export async function listarSuplencias(): Promise<SuplenciaItem[]> {
  const supabase = await createClient();

  const { data: suplencias, error } = await supabase
    .from("suplencias")
    .select("id, profesor_original, profesor_suplente, fecha_inicio, fecha_fin, activa")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/suplencias-data] error leyendo suplencias", error);
    return [];
  }
  if (!suplencias || suplencias.length === 0) return [];

  const profesorIds = [...new Set(suplencias.flatMap((s) => [s.profesor_original, s.profesor_suplente]))];
  const { data: perfiles } = await supabase.from("profiles").select("id, nombre, apellido").in("id", profesorIds);
  const nombrePorId = new Map((perfiles ?? []).map((p) => [p.id, `${p.nombre} ${p.apellido}`]));

  return suplencias.map((s): SuplenciaItem => ({
    id: s.id,
    profesorOriginalNombre: nombrePorId.get(s.profesor_original) ?? "?",
    profesorSuplenteNombre: nombrePorId.get(s.profesor_suplente) ?? "?",
    fechaInicio: s.fecha_inicio,
    fechaFin: s.fecha_fin,
    activa: s.activa,
  }));
}
