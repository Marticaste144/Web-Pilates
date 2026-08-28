import { createClient } from "@/lib/supabase/server";
import { listarMisClases } from "./clases-data";

export type AlumnaListItem = {
  alumnoId: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string;
  sedes: string[];
};

export type MisAlumnas = {
  alumnas: AlumnaListItem[];
  sedes: string[];
};

// Alumnas de TODAS las clases del profesor, sin duplicar una alumna que
// curse en más de una clase/sede -- mismo criterio de visibilidad que el
// roster por clase (obtenerClaseDetalle en clases-data.ts): por RLS, un
// perfil solo se resuelve acá una vez que esa alumna tiene alguna cuota
// aprobada en esa sede; hasta entonces cuenta para el cupo de su clase pero
// no aparece en este listado.
export async function listarMisAlumnas(): Promise<MisAlumnas> {
  const clases = await listarMisClases();
  if (clases.length === 0) return { alumnas: [], sedes: [] };

  const sedePorClase = new Map(clases.map((c) => [c.id, c.sedeNombre]));
  const sedes = [...new Set(clases.map((c) => c.sedeNombre))].sort();

  const supabase = await createClient();
  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("alumno_id, clase_id")
    .in(
      "clase_id",
      clases.map((c) => c.id),
    )
    .eq("estado", "activa");

  if (!inscripciones || inscripciones.length === 0) return { alumnas: [], sedes };

  const sedesPorAlumno = new Map<string, Set<string>>();
  for (const i of inscripciones) {
    const sedeNombre = sedePorClase.get(i.clase_id);
    if (!sedeNombre) continue;
    const set = sedesPorAlumno.get(i.alumno_id) ?? new Set<string>();
    set.add(sedeNombre);
    sedesPorAlumno.set(i.alumno_id, set);
  }

  const { data: perfiles } = await supabase
    .from("profiles")
    .select("id, nombre, apellido, telefono, email")
    .in("id", [...sedesPorAlumno.keys()]);

  const alumnas: AlumnaListItem[] = (perfiles ?? [])
    .map((p) => ({
      alumnoId: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      telefono: p.telefono,
      email: p.email,
      sedes: [...(sedesPorAlumno.get(p.id) ?? [])].sort(),
    }))
    .sort((a, b) => a.apellido.localeCompare(b.apellido));

  return { alumnas, sedes };
}
