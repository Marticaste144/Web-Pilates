import { createClient } from "@/lib/supabase/server";
import { listarMisClases } from "./clases-data";
import { listarClasesDeSuplencia } from "./suplencias-data";

export type AlumnaListItem = {
  alumnoId: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string;
  sedes: string[];
  // true si esta alumna solo aparece acá por una suplencia activa (no es
  // alumna "propia" de ninguna clase del profesor logueado).
  esSuplencia: boolean;
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
//
// Suma también las alumnas de clases que el profesor esté cubriendo por una
// suplencia activa (Tarea 5) -- marcadas con esSuplencia=true para
// distinguirlas en la tabla. La RLS (fn_es_mi_alumno extendida) ya permite
// resolver esos perfiles igual que los propios.
export async function listarMisAlumnas(): Promise<MisAlumnas> {
  const [clases, clasesSuplencia] = await Promise.all([listarMisClases(), listarClasesDeSuplencia()]);
  if (clases.length === 0 && clasesSuplencia.length === 0) return { alumnas: [], sedes: [] };

  const sedePorClase = new Map(clases.map((c) => [c.id, c.sedeNombre]));
  for (const c of clasesSuplencia) sedePorClase.set(c.id, c.sedeNombre);
  const claseIdsSuplencia = new Set(clasesSuplencia.map((c) => c.id));

  const sedes = [...new Set([...clases.map((c) => c.sedeNombre), ...clasesSuplencia.map((c) => c.sedeNombre)])].sort();

  const todasLasClaseIds = [...new Set([...clases.map((c) => c.id), ...clasesSuplencia.map((c) => c.id)])];
  if (todasLasClaseIds.length === 0) return { alumnas: [], sedes };

  const supabase = await createClient();
  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("alumno_id, clase_id")
    .in("clase_id", todasLasClaseIds)
    .eq("estado", "activa");

  if (!inscripciones || inscripciones.length === 0) return { alumnas: [], sedes };

  const sedesPorAlumno = new Map<string, Set<string>>();
  const esSuplenciaPorAlumno = new Map<string, boolean>();
  for (const i of inscripciones) {
    const sedeNombre = sedePorClase.get(i.clase_id);
    if (!sedeNombre) continue;
    const set = sedesPorAlumno.get(i.alumno_id) ?? new Set<string>();
    set.add(sedeNombre);
    sedesPorAlumno.set(i.alumno_id, set);
    // Una vez que aparece en una clase PROPIA, deja de contar como
    // "solo suplencia" -- ambas cosas pueden ser ciertas para la misma
    // persona si además es alumna en otra clase del profesor.
    if (!claseIdsSuplencia.has(i.clase_id)) {
      esSuplenciaPorAlumno.set(i.alumno_id, false);
    } else if (!esSuplenciaPorAlumno.has(i.alumno_id)) {
      esSuplenciaPorAlumno.set(i.alumno_id, true);
    }
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
      esSuplencia: esSuplenciaPorAlumno.get(p.id) ?? false,
    }))
    .sort((a, b) => a.apellido.localeCompare(b.apellido));

  return { alumnas, sedes };
}
