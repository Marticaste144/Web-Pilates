-- ============================================================================
-- MUV Gimnasia Postural — Pagos por actividad (mes calendario) + tolerancia
--
-- 1) pagos.sede_id pasa a NULLABLE y se agregan:
--    - actividades_ids uuid[]: qué actividad(es) cubre este pago (1 si es
--      una sola actividad, 2 si es un combo con el descuento del 20%
--      confirmado -- ver lib/cuota-calculo.ts). Vacío ('{}') en los pagos
--      viejos, que se preservan tal cual con su sede_id histórico.
--    - periodo_mes date: primer día del MES CALENDARIO que cubre este pago
--      (ej. 2026-09-01). Reemplaza a "vencimiento" (que seguía un ciclo
--      rodante de +1 mes desde la aprobación, no el mes calendario que pide
--      este bloque) para los pagos nuevos -- vencimiento se sigue
--      calculando igual que siempre (no se toca el trigger existente) por
--      compatibilidad con pagos viejos y para no romper nada que ya lo lea,
--      pero la lógica de vigencia/mora nueva usa periodo_mes.
--
-- 2) configuracion_pagos.dias_tolerancia: cuántos días de gracia después
--    del día 10 antes de dar de baja por falta de pago. NULL = todavía sin
--    confirmar con Laura -- mientras sea null, el cron de suspensión
--    automática NO suspende a nadie (falla seguro: mejor no suspender que
--    suspender con un número inventado).
-- ============================================================================

alter table public.pagos
  alter column sede_id drop not null,
  add column actividades_ids uuid[] not null default '{}',
  add column periodo_mes date;

comment on column public.pagos.actividades_ids is
  'Actividad(es) que cubre este pago (0 o 1 en pagos viejos por sede; 1 o 2 en pagos nuevos por actividad -- 2 = combo con el 20% de descuento en la más cara).';
comment on column public.pagos.periodo_mes is
  'Primer día del mes calendario que cubre este pago (ej. 2026-09-01) -- null en pagos viejos (ciclo rodante, ver vencimiento).';

alter table public.configuracion_pagos
  add column dias_tolerancia integer check (dias_tolerancia is null or dias_tolerancia >= 0);

comment on column public.configuracion_pagos.dias_tolerancia is
  'Días de gracia después del día 10 antes de suspender por falta de pago (con comprobante en revisión NUNCA se suspende, sin importar este valor). NULL = todavía sin confirmar con Laura -- el cron de suspensión automática no actúa mientras sea null.';
