import { createClient } from "@/lib/supabase/server";
import { fotoEstaticaDeProfesor } from "./profesores-fotos-estaticas";

export type ProfesorPublico = {
  id: string;
  nombre: string;
  fotoUrl: string;
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
    supabase.from("v_profesores_publicos").select("id, nombre, foto_url"),
    supabase.from("v_profesores_pendientes_publicos").select("nombre"),
  ]);

  if (errorConCuenta) console.error("[landing/profesores-data] error leyendo v_profesores_publicos", errorConCuenta);
  if (errorPendientes) console.error("[landing/profesores-data] error leyendo v_profesores_pendientes_publicos", errorPendientes);

  const conCuentaItems = (conCuenta ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    fotoUrl: p.foto_url ? supabase.storage.from("profesores").getPublicUrl(p.foto_url).data.publicUrl : fotoEstaticaDeProfesor(p.nombre),
  }));

  const nombresConCuenta = new Set(conCuentaItems.map((p) => normalizarNombre(p.nombre)));

  const pendientesItems = (pendientes ?? [])
    .filter((p) => !nombresConCuenta.has(normalizarNombre(p.nombre)))
    .map((p) => ({
      id: `pendiente:${normalizarNombre(p.nombre)}`,
      nombre: p.nombre,
      fotoUrl: fotoEstaticaDeProfesor(p.nombre),
    }));

  return [...conCuentaItems, ...pendientesItems]
    .filter((p): p is { id: string; nombre: string; fotoUrl: string } => p.fotoUrl !== null)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
