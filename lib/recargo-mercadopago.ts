// Función pura, sin imports de servidor -- separada de
// lib/configuracion-pagos.ts (que sí depende de next/headers a través de
// lib/supabase/server) para poder importarla también desde Client
// Components (ej. la vista previa en vivo del formulario de configuración).
//
// Sumar X% directo no compensa una comisión que Mercado Pago descuenta
// DESPUÉS de cobrar: si cobramos base*(1+pct), MP se queda con pct% de ese
// número más grande, y a MUV le llega MENOS del neto esperado. Para que a
// MUV le llegue exactamente "montoBase" luego de que MP se quede con su
// comisión, hay que DIVIDIR, no multiplicar:
//
//   cobrado * (1 - pct/100) = montoBase   =>   cobrado = montoBase / (1 - pct/100)
//
// Ejemplo con montoBase=41000 y pct=5: sumar 5% da 43050 -- MP se queda con
// el 5% de ESO (2152.50), a MUV le llegan 40897.50 (faltan $102.50). Con la
// fórmula de dividir: cobrado = 41000 / 0.95 = 43157.89 -> se redondea al
// peso: 43158. MP se queda con 5% de 43158 (2157.90), a MUV le llegan
// 43158 - 2157.90 = 41000.10 -- prácticamente exacto (los ~10 centavos de
// diferencia son solo por redondear el cobro final al peso entero, como el
// resto de los precios de la app).
export function calcularRecargoMercadoPago(montoBase: number, recargoPct: number): number {
  if (recargoPct <= 0) return 0;
  const montoConRecargoExacto = montoBase / (1 - recargoPct / 100);
  return Math.round(montoConRecargoExacto) - montoBase;
}
