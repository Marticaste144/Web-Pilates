// Los horarios (de clases o de lo que sea que ocurra semanalmente) son
// recurrentes por día de la semana, no por fecha de calendario -- mismo
// criterio que el selector de día del alumno (paso 9) y el panorama del
// profesor (paso 12). Función pura y genérica: la usan tanto el panorama
// del profesor (sus clases) como el de la home del alumno (sus propias
// inscripciones) para calcular "la próxima vez que pasa esto".
export type OcurrenciaSemanal = { diaSemana: number; horaInicio: string };

export function calcularProximaOcurrencia<T extends OcurrenciaSemanal>(
  items: T[],
  ahora: Date = new Date(),
): T | null {
  if (items.length === 0) return null;

  const diaHoy = ahora.getDay() === 0 ? 7 : ahora.getDay(); // 1=lunes..7=domingo
  const horaHoy = ahora.toTimeString().slice(0, 8); // "HH:MM:SS", comparable con hora_inicio

  const diasHasta = (item: T): number => {
    let dias = (item.diaSemana - diaHoy + 7) % 7;
    if (dias === 0 && item.horaInicio <= horaHoy) dias = 7; // hoy, pero ya pasó -- la próxima es en una semana
    return dias;
  };

  return [...items].sort((a, b) => {
    const diff = diasHasta(a) - diasHasta(b);
    return diff !== 0 ? diff : a.horaInicio.localeCompare(b.horaInicio);
  })[0];
}
