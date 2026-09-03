// Fotos reales subidas a /public -- asociadas por NOMBRE a los profesores
// reales de MUV, tengan o no cuenta de acceso todavía (ver
// profesor_pendiente_nombre en clases). Se usan como FALLBACK, nunca como
// reemplazo del sistema real: si el profesor tiene `foto_url` (subida desde
// /admin/profesores/[id], bucket de Storage), esa sigue ganando siempre --
// ver listarProfesoresPublicos/listarProfesores/obtenerProfesor y las
// cards de horarios (BLOQUE DATOS REALES). Sin dependencias de servidor a
// propósito (como dias-semana.ts): la puede importar tanto un Server
// Component como uno de cliente.
//
// Verificado contra la nómina real antes de escribir esto (no se inventó
// ninguna asociación): las 11 fotos subidas coinciden por nombre con
// alguien de la nómina real (con cuenta ya creada o pendiente de invitar).
// Sin foto todavía: Rocío, Gabriela, Mariel, Nicolás, Analía, Richard --
// listarProfesoresPublicos (landing) los deja afuera hasta que haya una.
export const FOTOS_PROFESORES_ESTATICAS: Record<string, string> = {
  sabina: "/foto-sabina.jpeg", // Sabina Duarte (cuenta real)
  laura: "/foto-laura.jpeg", // Laura Pagola (cuenta real)
  laila: "/foto-laila.jpeg", // Laila Casin (cuenta real)
  alan: "/foto-alan.jpeg", // pendiente de cuenta
  camila: "/foto-camila.jpeg", // pendiente de cuenta
  gonzalo: "/foto-gonzalo.jpeg", // pendiente de cuenta
  matias: "/foto-matias.jpeg", // pendiente de cuenta (sin tilde a propósito: la clave se normaliza sin diacríticos)
  nacho: "/foto-nacho.jpeg", // pendiente de cuenta
  pablo: "/foto-pablo.jpeg", // pendiente de cuenta
  sofia: "/foto-sofia.jpeg", // pendiente de cuenta (sin tilde a propósito)
  yayi: "/foto-yayi.jpeg", // pendiente de cuenta

  // Sin foto todavía: Rocío, Gabriela, Mariel, Nicolás, Analía, Richard.
};

const DIACRITICOS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

function normalizar(nombre: string): string {
  return nombre.trim().toLowerCase().normalize("NFD").replace(DIACRITICOS, "");
}

export function fotoEstaticaDeProfesor(nombre: string): string | null {
  return FOTOS_PROFESORES_ESTATICAS[normalizar(nombre)] ?? null;
}
