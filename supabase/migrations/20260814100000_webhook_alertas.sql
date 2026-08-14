-- ============================================================================
-- MUV Gimnasia Postural — dedupe de alertas por email cuando el webhook de
-- Mercado Pago falla. Mercado Pago reintenta la misma notificación (mismo
-- data.id) varias veces si le devolvemos un error -- sin este dedupe, cada
-- reintento mandaría un email nuevo. Con la unique constraint sobre
-- mp_data_id, el primer INSERT para ese data.id gana y dispara el email;
-- los reintentos posteriores para el MISMO data.id chocan contra la
-- constraint (error 23505) y no vuelven a mandar nada.
-- ============================================================================

create table public.webhook_alertas_enviadas (
  id uuid primary key default gen_random_uuid(),
  mp_data_id text not null unique,
  tipo_error text not null,
  detalle text,
  created_at timestamptz not null default now()
);

comment on table public.webhook_alertas_enviadas is
  'Registro de alertas por email ya enviadas por fallos del webhook de Mercado Pago -- evita reenviar un email por cada reintento de la misma notificación.';

alter table public.webhook_alertas_enviadas enable row level security;

-- Solo el webhook (service_role, que bypassea RLS) escribe acá. La admin
-- puede consultarlo si hace falta diagnosticar, mismo criterio que
-- pagos_auditoria.
create policy "admin ve alertas de webhook"
  on public.webhook_alertas_enviadas for select
  using (public.fn_current_role() = 'admin');
