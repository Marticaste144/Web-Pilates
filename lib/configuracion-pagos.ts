import { createClient } from "@/lib/supabase/server";

export type ConfiguracionPagos = {
  aliasTransferencia: string | null;
  cbuTransferencia: string | null;
  titularTransferencia: string | null;
  /** Otro alias/CBU de destino para transferir a mano (ej. cuenta de Mercado Pago) -- no es una integración. */
  aliasMercadopago: string | null;
};

const DEFAULT_CONFIG: ConfiguracionPagos = {
  aliasTransferencia: null,
  cbuTransferencia: null,
  titularTransferencia: null,
  aliasMercadopago: null,
};

// Fila única (id=true), legible por cualquier autenticado -- ver migración
// 20260815100000_configuracion_pagos.sql (extendida en
// 20260901150000_datos_transferencia_sin_mercadopago.sql con
// alias_mercadopago). El pago ya no tiene ningún recargo (se dejó de
// integrar Mercado Pago): recargo_mercadopago_pct sigue en la base por
// compatibilidad con pagos históricos, pero no se lee más acá. Si por lo
// que sea la fila no está (no debería pasar, se siembra en la migración),
// se cae a "sin datos cargados" en vez de romper el flujo de pago.
export async function obtenerConfiguracionPagos(): Promise<ConfiguracionPagos> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("configuracion_pagos")
    .select("alias_transferencia, cbu_transferencia, titular_transferencia, alias_mercadopago")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    console.error("[configuracion-pagos] no se pudo leer la configuración de pagos", error);
    return DEFAULT_CONFIG;
  }
  if (!data) return DEFAULT_CONFIG;

  return {
    aliasTransferencia: data.alias_transferencia,
    cbuTransferencia: data.cbu_transferencia,
    titularTransferencia: data.titular_transferencia,
    aliasMercadopago: data.alias_mercadopago,
  };
}
