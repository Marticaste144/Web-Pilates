import { createClient } from "@/lib/supabase/server";
import { fotoEstaticaDeProfesor } from "./profesores-fotos-estaticas";

export type ProfesorPublico = {
  id: string;
  nombre: string;
  fotoUrl: string;
  /** Reales, de sus clases activas -- vacío si todavía no tiene ninguna cargada (nunca se inventa). */
  sedes: string[];
  actividades: string[];
};

const DIACRITICOS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

function normalizarNombre(nombre: string): string {
  return nombre.trim().toLowerCase().normalize("NFD").replace(DIACRITICOS, "");
}

// Público (landing sin sesión) -- combina DOS fuentes, no solo una:
//   1) v_profesores_publicos: profesores con cuenta ya creada (activo=true).
//   2) v_profesores_pendientes_publicos: profesores reales SIN cuenta
//      todavía (clases.profesor_pendiente_nombre) -- son la mayoría de la
//      plantilla real hoy (ver 20260903110000_horarios_reales_septiembre) y
//      sin esto "Nuestro equipo" solo mostraría a quienes ya tienen cuenta.
// Si el mismo nombre aparece en las dos listas (se vinculó una cuenta), gana
// la de cuenta real -- se descarta el duplicado pendiente por nombre
// normalizado (sin tildes/mayúsculas).
//
// Ambas vistas devuelven una fila POR CLASE activa (fan-out, ver migración
// 20260904120000) -- acá se agrupa por profesor y se arman los sets de
// sede/actividad reales (Set, no array plano: la misma persona puede dar la
// misma actividad en la misma sede en varios horarios distintos, eso no
// debe repetirse en la card).
//
// foto_url guarda un PATH del bucket "profesores" (público), no una URL --
// getPublicUrl solo arma el string, no hace ningún request de red. Si
// todavía no se subió ninguna foto desde Admin, se usa como fallback la
// foto real estática de /public que coincida por nombre (BLOQUE VISUAL) --
// esa subida sigue ganando siempre que exista.
//
// Solo se listan público quienes tienen alguna foto resuelta (subida o
// estática) -- pedido explícito: mejor no mostrarlos todavía que mostrar un
// placeholder genérico en "Nuestro equipo" (Rocío, Gabriela, Mariel,
// Nicolás, Analía, Richard quedan afuera hasta que haya foto real de cada
// una/o).
export async function listarProfesoresPublicos(): Promise<ProfesorPublico[]> {
  const supabase = await createClient();

  const [{ data: conCuenta, error: errorConCuenta }, { data: pendientes, error: errorPendientes }] = await Promise.all([
    supabase.from("v_profesores_publicos").select("id, nombre, foto_url, sede_nombre, actividad_nombre"),
    supabase.from("v_profesores_pendientes_publicos").select("nombre, sede_nombre, actividad_nombre"),
  ]);

  if (errorConCuenta) console.error("[landing/profesores-data] error leyendo v_profesores_publicos", errorConCuenta);
  if (errorPendientes) console.error("[landing/profesores-data] error leyendo v_profesores_pendientes_publicos", errorPendientes);

  type FilaAgrupada = { id: string; nombre: string; fotoUrl: string | null; sedes: Set<string>; actividades: Set<string> };

  const conCuentaPorId = new Map<string, FilaAgrupada>();
  for (const p of conCuenta ?? []) {
    const fila = conCuentaPorId.get(p.id) ?? {
      id: p.id,
      nombre: p.nombre,
      fotoUrl: p.foto_url ? supabase.storage.from("profesores").getPublicUrl(p.foto_url).data.publicUrl : fotoEstaticaDeProfesor(p.nombre),
      sedes: new Set<string>(),
      actividades: new Set<string>(),
    };
    if (p.sede_nombre) fila.sedes.add(p.sede_nombre);
    if (p.actividad_nombre) fila.actividades.add(p.actividad_nombre);
    conCuentaPorId.set(p.id, fila);
  }
  const conCuentaItems: ProfesorPublico[] = [...conCuentaPorId.values()]
    .filter((f): f is FilaAgrupada & { fotoUrl: string } => f.fotoUrl !== null)
    .map((f) => ({ id: f.id, nombre: f.nombre, fotoUrl: f.fotoUrl, sedes: [...f.sedes].sort(), actividades: [...f.actividades].sort() }));

  const nombresConCuenta = new Set(conCuentaItems.map((p) => normalizarNombre(p.nombre)));

  const pendientesPorNombre = new Map<string, FilaAgrupada>();
  for (const p of pendientes ?? []) {
    const key = normalizarNombre(p.nombre);
    if (nombresConCuenta.has(key)) continue;
    const fila = pendientesPorNombre.get(key) ?? {
      id: `pendiente:${key}`,
      nombre: p.nombre,
      fotoUrl: fotoEstaticaDeProfesor(p.nombre),
      sedes: new Set<string>(),
      actividades: new Set<string>(),
    };
    if (p.sede_nombre) fila.sedes.add(p.sede_nombre);
    if (p.actividad_nombre) fila.actividades.add(p.actividad_nombre);
    pendientesPorNombre.set(key, fila);
  }
  const pendientesItems: ProfesorPublico[] = [...pendientesPorNombre.values()]
    .filter((f): f is FilaAgrupada & { fotoUrl: string } => f.fotoUrl !== null)
    .map((f) => ({ id: f.id, nombre: f.nombre, fotoUrl: f.fotoUrl, sedes: [...f.sedes].sort(), actividades: [...f.actividades].sort() }));

  return [...conCuentaItems, ...pendientesItems].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
