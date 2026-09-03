// Cálculo de cuota (BLOQUE DATOS REALES, Tareas 4 y 5) -- funciones puras,
// sin acceso a la base, para que sean fáciles de verificar contra el
// ejemplo dado por Laura y de reusar tanto en el alta de un comprobante
// (alumno) como en cualquier pantalla de Admin que necesite mostrar el
// mismo número. Todo en pesos ENTEROS, sin redondear (pedido explícito:
// "por ahora NO redondear").

// ---------------------------------------------------------------------------
// Mes calendario, nunca "30 días desde el pago": cuenta cuántas veces cae un
// día de la semana (1=lunes..7=domingo, misma convención ISO que dia_semana
// en toda la app) dentro de un mes, opcionalmente a partir de un día del mes
// en adelante (para "cuántas clases le quedan desde que se incorpora").
// ---------------------------------------------------------------------------
function diaSemanaIso(fecha: Date): number {
  const js = fecha.getUTCDay(); // 0=domingo..6=sábado
  return js === 0 ? 7 : js;
}

export function contarOcurrenciasDiaEnMes(anio: number, mes: number, diaSemana: number, desdeDia = 1): number {
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate(); // día 0 del mes siguiente = último día de "mes"
  let count = 0;
  for (let dia = Math.max(desdeDia, 1); dia <= ultimoDia; dia++) {
    if (diaSemanaIso(new Date(Date.UTC(anio, mes - 1, dia))) === diaSemana) count++;
  }
  return count;
}

// Para una alumna con clases en varios días de la semana (ej. Pilates 2x =
// lunes y miércoles): total de clases que le corresponden en TODO el mes, y
// cuántas le quedan desde el día que se incorpora (inclusive) hasta fin de
// mes. Si se incorpora el día 1, "restantes" = "totalMes" (ciclo normal).
export function calcularClasesDelMesYRestantes(
  anio: number,
  mes: number,
  diasSemana: number[],
  diaIncorporacion: number,
): { totalMes: number; restantes: number } {
  let totalMes = 0;
  let restantes = 0;
  for (const dia of diasSemana) {
    totalMes += contarOcurrenciasDiaEnMes(anio, mes, dia);
    restantes += contarOcurrenciasDiaEnMes(anio, mes, dia, diaIncorporacion);
  }
  return { totalMes, restantes };
}

// ---------------------------------------------------------------------------
// Proporcional: precio mensual ÷ clases del mes × clases que quedan. Ejemplo
// del pedido: Pilates 2x = $61.000, 8 clases en el mes, quedan 3 →
// 61000 / 8 * 3 = 22875.
// ---------------------------------------------------------------------------
export function calcularCuotaProporcional(precioMensual: number, clasesDelMes: number, clasesRestantes: number): number {
  if (clasesDelMes <= 0) return 0;
  return (precioMensual / clasesDelMes) * clasesRestantes;
}

// ---------------------------------------------------------------------------
// Dos actividades distintas: la actividad MÁS CARA paga con 20% off, la
// otra al precio completo (regla confirmada por Laura -- ejemplo real:
// Pilates 2x $61.000 -> 20% off -> $48.800, más Postural 1x $44.000 al
// 100% -> total $92.800). La regla es por ACTIVIDAD, no por sede: si el
// alumno hace las dos actividades en sedes distintas, igual se comparan
// entre sí para decidir cuál de las dos lleva el descuento -- por eso esta
// función recibe un item por cada (sede, actividad) del alumno y agrupa por
// actividadId antes de comparar, en vez de asumir que ya vienen los
// "2 precios de una misma sede". Para 3 o más actividades distintas no hay
// una regla confirmada todavía -- se devuelven los precios completos, sin
// ningún descuento, hasta que Laura la defina (no se inventa cómo
// extenderla). "Combinado" (mencionado por Laura) es un concepto aparte,
// de significado y precio todavía sin confirmar -- no es sinónimo de "3
// actividades" ni de ninguna frecuencia puntual, así que tampoco se
// automatiza acá.
// ---------------------------------------------------------------------------
export function aplicarDescuentoDosActividades<T extends { actividadId: string; precio: number }>(items: T[]): T[] {
  const actividadesDistintas = [...new Set(items.map((i) => i.actividadId))];
  if (actividadesDistintas.length !== 2) return items;

  const totalPorActividad = new Map<string, number>();
  for (const actividadId of actividadesDistintas) {
    totalPorActividad.set(
      actividadId,
      items.filter((i) => i.actividadId === actividadId).reduce((acc, i) => acc + i.precio, 0),
    );
  }
  const [a, b] = actividadesDistintas;
  const actividadMasCara = (totalPorActividad.get(a) ?? 0) >= (totalPorActividad.get(b) ?? 0) ? a : b;

  return items.map((i) => (i.actividadId === actividadMasCara ? { ...i, precio: i.precio * 0.8 } : i));
}
