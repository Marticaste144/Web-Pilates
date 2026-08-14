import { createClient } from "@/lib/supabase/server";

// La fórmula del recargo (calcularRecargoMercadoPago) vive en
// lib/recargo-mercadopago.ts, NO acá -- ese archivo es una función pura sin
// imports, así que también lo pueden importar Client Components (ej. la
// vista previa del formulario de configuración). Si se reexportara desde
// acá, cualquier import de esa función arrastraría este módulo entero
// (que depende de next/headers vía lib/supabase/server) y rompería el build
// apenas se usara desde un componente de cliente.

export type ConfiguracionPagos = {
  recargoMercadopagoPct: number;
  aliasTransferencia: string | null;
  cbuTransferencia: string | null;
  titularTransferencia: string | null;
};

const DEFAULT_CONFIG: ConfiguracionPagos = {
  recargoMercadopagoPct: 0,
  aliasTransferencia: null,
  cbuTransferencia: null,
  titularTransferencia: null,
};

// Fila única (id=true), legible por cualquier autenticado -- ver migración
// 20260815100000_configuracion_pagos.sql. Si por lo que sea la fila no
// está (no debería pasar, se siembra en la migración), se cae a "sin
// recargo" en vez de romper el flujo de pago.
export async function obtenerConfiguracionPagos(): Promise<ConfiguracionPagos> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("configuracion_pagos")
    .select("recargo_mercadopago_pct, alias_transferencia, cbu_transferencia, titular_transferencia")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    console.error("[configuracion-pagos] no se pudo leer la configuración de pagos", error);
    return DEFAULT_CONFIG;
  }
  if (!data) return DEFAULT_CONFIG;

  return {
    recargoMercadopagoPct: data.recargo_mercadopago_pct,
    aliasTransferencia: data.alias_transferencia,
    cbuTransferencia: data.cbu_transferencia,
    titularTransferencia: data.titular_transferencia,
  };
}
