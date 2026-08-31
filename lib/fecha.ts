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

// 1=lunes..7=domingo (mismo criterio que dia_semana en toda la app),
// calculado a partir de hoyISO() -- nunca de Date.getDay() a secas, por el
// mismo motivo de huso horario documentado arriba.
export function diaSemanaHoy(): number {
  const dia = new Date(`${hoyISO()}T12:00:00Z`).getUTCDay();
  return dia === 0 ? 7 : dia;
}

// "HH:MM:SS" de la hora actual en Buenos Aires -- comparable directo contra
// hora_inicio/hora_fin (columnas `time` de Postgres, mismo formato). Se arma
// con formatToParts (no con el string ya formateado) para no depender de
// separadores propios de una locale/runtime en particular.
export function horaAhoraISO(): string {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA_HORARIA_ESTUDIO,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "00";
  return `${parte("hour")}:${parte("minute")}:${parte("second")}`;
}

const DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES_LARGO = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// "lunes 26 de mayo" a partir de una fecha YYYY-MM-DD -- mismo truco que
// fechaUltimaOcurrencia (mediodía UTC) para leer día/mes sin depender del
// huso horario del runtime.
export function formatearFechaLarga(fechaISO: string): string {
  const fecha = new Date(`${fechaISO}T12:00:00Z`);
  return `${DIAS_LARGO[fecha.getUTCDay()]} ${fecha.getUTCDate()} de ${MESES_LARGO[fecha.getUTCMonth()]}`;
}

// "26 de mayo", sin día de la semana -- para mostrar junto a un día que ya
// se muestra aparte (ej. el de la clase, resuelto desde dia_semana en vez
// de desde esta fecha).
export function formatearDiaMes(fechaISO: string): string {
  const fecha = new Date(`${fechaISO}T12:00:00Z`);
  return `${fecha.getUTCDate()} de ${MESES_LARGO[fecha.getUTCMonth()]}`;
}
