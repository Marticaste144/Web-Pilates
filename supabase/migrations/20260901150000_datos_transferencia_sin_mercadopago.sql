-- ============================================================================
-- MUV Gimnasia Postural — Se deja de usar la integración automática de
-- Mercado Pago (Checkout Pro + webhook). El pago pasa a ser 100%
-- transferencia (con comprobante, revisado por la admin) o efectivo.
--
-- Se reutiliza la tabla configuracion_pagos (fila única, migración
-- 20260815100000) en vez de crear una tabla nueva -- solo se le agrega un
-- segundo alias de destino ("Mercado Pago / Alias", que acá es simplemente
-- OTRO alias bancario al que se puede transferir a mano, NO una integración).
-- Se precargan los 3 datos reales de transferencia que confirmó la admin.
--
-- recargo_mercadopago_pct y pagos.recargo_mercadopago NO se borran (quedan
-- las columnas para no perder el historial de pagos viejos que sí tuvieron
-- recargo por Checkout Pro), pero la app deja de leerlos/calcularlos para
-- pagos nuevos -- ver lib/configuracion-pagos.ts y app/alumno/cuota/*.
-- El tipo enum medio_pago tampoco pierde el valor 'mercadopago' (pagos.medio
-- histórico), simplemente nadie vuelve a insertar una fila nueva con ese medio.
-- ============================================================================

alter table public.configuracion_pagos
  add column if not exists alias_mercadopago text;

comment on column public.configuracion_pagos.alias_mercadopago is
  'Otro alias/CBU al que el alumno puede transferir a mano (ej. una cuenta de Mercado Pago usada como destino) -- NO es una integración ni un checkout, es solo un dato más para transferencia manual.';

update public.configuracion_pagos
set
  titular_transferencia = 'María Laura Pagola',
  alias_transferencia = 'laura.pagola',
  alias_mercadopago = 'lau.pagola.lasagno'
where id = true
  and titular_transferencia is null
  and alias_transferencia is null;

comment on column public.configuracion_pagos.recargo_mercadopago_pct is
  'Ya no se usa (se dejó de integrar Mercado Pago) -- queda la columna por compatibilidad con el historial, pero ningún flujo nuevo la lee ni la calcula.';
