// Armado de CSV a mano (sin librería) -- separador coma, CRLF (RFC 4180,
// lo que espera Excel), BOM UTF-8 al principio para que Excel abra bien los
// acentos (sin el BOM, Excel en Windows suele mostrar "Ã­" en vez de "í").
function escaparCampo(valor: string | number | null): string {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function aCsv(headers: string[], filas: (string | number | null)[][]): string {
  const lineas = [headers, ...filas].map((fila) => fila.map(escaparCampo).join(","));
  return "﻿" + lineas.join("\r\n");
}
