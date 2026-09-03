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
// Dos actividades con precio distinto: la más cara paga con 20% off, la
// otra al precio completo (regla CONFIRMADA). Para 3 o más actividades
// distintas en el mismo pago no hay una regla confirmada todavía -- se
// suman completas (sin ningún descuento) hasta que Laura la defina, en vez
// de inventar cómo extenderla.
// ---------------------------------------------------------------------------
export function calcularMontoCombinado(precios: number[]): number {
  if (precios.length === 0) return 0;
  if (precios.length === 1) return precios[0];
  if (precios.length === 2) {
    const masCara = Math.max(precios[0], precios[1]);
    const masBarata = Math.min(precios[0], precios[1]);
    return masCara * 0.8 + masBarata;
  }
  return precios.reduce((acc, p) => acc + p, 0);
}
