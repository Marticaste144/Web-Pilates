// Resuelve el nombre a mostrar del profesor de una clase: el nombre real
// (SOLO nombre, sin apellido -- pedido explícito de este bloque) si la
// clase ya tiene profesor_id, o el nombre pendiente (profesor_pendiente_
// nombre) si todavía no tiene cuenta de acceso. Nunca los dos a la vez --
// constraint de base, ver migración 20260903100000_clases_profesor_
// pendiente.sql. Sin dependencias de servidor a propósito (como
// dias-semana.ts): la puede importar tanto un Server Component como uno de
// cliente.
export function nombreProfesorClase(nombreReal: string | undefined | null, pendienteNombre: string | null | undefined): string {
  return nombreReal ?? pendienteNombre ?? "?";
}
