-- ============================================================================
-- MUV Gimnasia Postural — recargo de Mercado Pago + datos de transferencia
--
-- Confirmado con un pago real: Mercado Pago se queda con una comisión
-- (~4-5%, varía según tarjeta/cuotas) que hasta ahora perdía el negocio en
-- cada cobro. Esta migración agrega:
--
-- 1) configuracion_pagos: fila única (GLOBAL, no por sede) con el % de
--    recargo a aplicar cuando se paga con Mercado Pago, y los datos de la
--    cuenta para transferencias (alias/CBU/titular). Es global y no por
--    sede a propósito: la comisión de MP no depende de en qué sede se paga
--    (depende de la tarjeta/cuotas que elige quien paga, algo que MP
--    calcula de su lado, fuera de nuestro control), y la cuenta bancaria de
--    destino de una transferencia tampoco varía por sede salvo que MUV
--    tuviera una cuenta distinta por local, que hoy no es el caso.
-- 2) pagos.recargo_mercadopago: cuánto de más se le cobró al alumno en un
--    pago con Mercado Pago, aparte de "monto". "monto" SIEMPRE sigue
--    siendo el valor neto de la cuota (lo que le corresponde a MUV, igual
--    que hasta ahora) -- así el dashboard, el CSV de pagos y cualquier
--    reporte financiero existente siguen sumando lo correcto sin tocar una
--    sola línea de esos otros lugares. El recargo queda aparte, solo como
--    metadata de cuánto se le cobró de más al alumno por elegir esa vía.
-- ============================================================================

create table public.configuracion_pagos (
  id boolean primary key default true,
  recargo_mercadopago_pct numeric(5, 2) not null default 0
    check (recargo_mercadopago_pct >= 0 and recargo_mercadopago_pct < 100),
  alias_transferencia text,
  cbu_transferencia text,
  titular_transferencia text,
  updated_at timestamptz not null default now(),
  constraint configuracion_pagos_singleton check (id)
);

comment on table public.configuracion_pagos is
  'Fila única (id siempre true) -- configuración global de recargo de Mercado Pago y datos de transferencia.';

insert into public.configuracion_pagos (id) values (true);

alter table public.configuracion_pagos enable row level security;

-- Todos los roles autenticados necesitan leerla: el alumno para ver el
-- precio con recargo y los datos de transferencia al pagar.
create policy "autenticados ven configuracion de pagos"
  on public.configuracion_pagos for select
  to authenticated
  using (true);

create policy "admin edita configuracion de pagos"
  on public.configuracion_pagos for update
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

create trigger trg_configuracion_pagos_updated_at
  before update on public.configuracion_pagos
  for each row execute function public.fn_set_updated_at();

alter table public.pagos add column recargo_mercadopago numeric(10, 2);

comment on column public.pagos.recargo_mercadopago is
  'Extra cobrado por sobre "monto" en un pago con Mercado Pago, para compensar la comisión que MP descuenta. NULL/0 para efectivo y transferencia (sin recargo). "monto" sigue siendo siempre el valor neto de la cuota.';
