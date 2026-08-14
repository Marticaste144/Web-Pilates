// El estudio opera en Argentina (America/Argentina/Buenos_Aires, UTC-3, sin
// horario de verano). NUNCA usar `new Date().toISOString().slice(0, 10)`
// para "la fecha de hoy": toISOString() siempre da la fecha en UTC, que se
// adelanta un día respecto al calendario real en Argentina durante la
// noche (desde las 21:00 ART en adelante, ya es "mañana" en UTC).
//
// Causa real confirmada de un bug reportado: una asistencia tomada después
// de las 21:00 (profesor sin elegir fecha a mano, usando el default de
// "hoy") se guardaba con la fecha de MAÑANA en vez de la fecha real de la
// clase. El PDF semanal, que calcula la fecha exacta de cada clase a
// partir de su día de la semana (no de "hoy"), buscaba la fecha correcta y
// no encontraba esa asistencia -- la mostraba como "Sin tomar" pese a que
// sí se había marcado. Reproducido con un script Node simulando el
// instante exacto de marcar asistencia a las 21:05 ART: hoyISO() (versión
// vieja) daba el día siguiente; con Intl.DateTimeFormat + timeZone da el
// día correcto en todos los casos límite probados (23:59 y 00:01 ART).
const ZONA_HORARIA_ESTUDIO = "America/Argentina/Buenos_Aires";

// Sirve tanto en servidor como en cliente (Intl con timeZone explícito no
// depende de la zona horaria configurada en el runtime ni en el navegador).
export function hoyISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA_ESTUDIO }).format(new Date());
}
