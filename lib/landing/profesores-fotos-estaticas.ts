// Fotos reales subidas a /public (BLOQUE VISUAL) -- asociadas por NOMBRE a
// los profesores que ya existen en la base. Se usan como FALLBACK, nunca
// como reemplazo del sistema real: si el profesor tiene `foto_url` (subida
// desde /admin/profesores/[id], bucket de Storage), esa sigue ganando
// siempre -- ver listarProfesoresPublicos/listarProfesores/obtenerProfesor.
// Sin dependencias de servidor a propósito (como dias-semana.ts): la puede
// importar tanto un Server Component como uno de cliente.
//
// Verificado contra los profesores reales de la base antes de escribir esto
// (no se inventó ninguna asociación): de las 11 fotos subidas, solo 3
// coinciden por nombre con un profesor existente. Las otras 8 quedan sin
// usar hasta que esas personas se carguen como profesores reales -- no se
// asignan a nadie "parecido".
export const FOTOS_PROFESORES_ESTATICAS: Record<string, string> = {
  sabina: "/foto-sabina.jpeg", // Sabina Duarte
  laura: "/foto-laura.jpeg", // Laura Pagola
  laila: "/foto-laila.jpeg", // Laila Casin

  // Pendientes -- sin profesor real con ese nombre en la base todavía:
  // alan, camila, gonzalo, matias, nacho, pablo, sofia, yayi.
};

const DIACRITICOS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

function normalizar(nombre: string): string {
  return nombre.trim().toLowerCase().normalize("NFD").replace(DIACRITICOS, "");
}

export function fotoEstaticaDeProfesor(nombre: string): string | null {
  return FOTOS_PROFESORES_ESTATICAS[normalizar(nombre)] ?? null;
}
