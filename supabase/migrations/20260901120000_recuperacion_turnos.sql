-- ============================================================================
-- MUV Gimnasia Postural — Motor de recuperación de turnos
--
-- 1) turnos_liberados: una alumna libera su lugar en UNA sesión puntual
--    (clase_id + fecha) de una clase en la que está inscripta, hasta 1hs
--    antes de que empiece. Otra alumna de la MISMA sede puede tomar ese
--    lugar (recuperar), también hasta 1hs antes. Esto es independiente de
--    la inscripción semanal fija (inscripciones) -- no la toca para nada,
--    es solo una señal de "hoy no voy, alguien más puede venir".
-- 2) configuracion_recuperaciones: fila única (GLOBAL, mismo criterio que
--    configuracion_pagos) con el máximo de recuperaciones por mes que puede
--    usar una alumna. Todavía no se sabe el número final ni si en el futuro
--    aplica por sede -- queda simple y editable desde /admin sin tocar código.
-- 3) Al tomarse un turno, se crea la fila de asistencia correspondiente con
--    es_recuperacion = true (el tag que ya se había dejado preparado en
--    confirmacion_asistencia) -- así el profesor la ve en la misma lista de
--    "confirmadas" de su clase, marcada como recuperación.
--
-- Reescrita para poder correrse de nuevo sin error sobre lo que ya haya
-- quedado creado de un intento anterior (create table/policy/trigger todos
-- con guard) y con un tag propio por cada función ($fn_..$ en vez de $$
-- genérico) para que cada bloque quede inequívocamente delimitado.
-- ============================================================================

create table if not exists public.configuracion_recuperaciones (
  id boolean primary key default true,
  max_recuperaciones_por_mes int not null default 2 check (max_recuperaciones_por_mes >= 0),
  updated_at timestamptz not null default now(),
  constraint configuracion_recuperaciones_singleton check (id)
);

comment on table public.configuracion_recuperaciones is
  'Fila única (id siempre true) -- configuración global del máximo de recuperaciones por mes. Editable desde /admin sin tocar código.';

insert into public.configuracion_recuperaciones (id)
values (true)
on conflict (id) do nothing;

alter table public.configuracion_recuperaciones enable row level security;

drop policy if exists "autenticados ven configuracion de recuperaciones" on public.configuracion_recuperaciones;
create policy "autenticados ven configuracion de recuperaciones"
  on public.configuracion_recuperaciones for select
  to authenticated
  using (true);

drop policy if exists "admin edita configuracion de recuperaciones" on public.configuracion_recuperaciones;
create policy "admin edita configuracion de recuperaciones"
  on public.configuracion_recuperaciones for update
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

drop trigger if exists trg_configuracion_recuperaciones_updated_at on public.configuracion_recuperaciones;
create trigger trg_configuracion_recuperaciones_updated_at
  before update on public.configuracion_recuperaciones
  for each row execute function public.fn_set_updated_at();

-- ---------------------------------------------------------------------------
create table if not exists public.turnos_liberados (
  id uuid primary key default gen_random_uuid(),
  clase_id uuid not null references public.clases (id) on delete cascade,
  fecha date not null,
  alumno_original_id uuid not null references public.alumnos (profile_id) on delete cascade,
  liberado_en timestamptz not null default now(),
  tomado_por_id uuid references public.alumnos (profile_id) on delete set null,
  tomado_en timestamptz,
  unique (clase_id, fecha, alumno_original_id)
);

comment on table public.turnos_liberados is
  'Un lugar liberado por una alumna en una sesión puntual (clase_id+fecha) -- no toca la inscripción semanal fija. tomado_por_id null = todavía disponible para que alguien lo recupere.';

create index if not exists idx_turnos_liberados_disponibles on public.turnos_liberados (clase_id, fecha) where tomado_por_id is null;
create index if not exists idx_turnos_liberados_tomados on public.turnos_liberados (tomado_por_id, fecha);

alter table public.turnos_liberados enable row level security;

-- ---------------------------------------------------------------------------
-- ¿La alumna logueada tiene alguna inscripción activa en la MISMA sede que
-- la clase p_clase_id? (no necesariamente en esa clase puntual) -- es la
-- regla de "la recuperación es dentro de la misma sede/disciplina".
-- ---------------------------------------------------------------------------
create or replace function public.fn_alumno_en_sede_de_clase(p_clase_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn_alumno_en_sede_de_clase$
  select exists (
    select 1
    from public.inscripciones i
    join public.clases c1 on c1.id = i.clase_id
    join public.clases c2 on c2.sede_id = c1.sede_id
    where i.alumno_id = auth.uid() and i.estado = 'activa' and c2.id = p_clase_id
  );
$fn_alumno_en_sede_de_clase$;

-- Ventana de liberación: hasta 1hs antes del inicio de la clase.
create or replace function public.fn_validar_liberacion_turno()
returns trigger
language plpgsql
security definer set search_path = public
as $fn_validar_liberacion_turno$
declare
  v_hora_inicio time;
  v_inicio_clase timestamptz;
begin
  if public.fn_current_role() = 'admin' then
    return new;
  end if;

  select hora_inicio into v_hora_inicio from public.clases where id = new.clase_id;
  v_inicio_clase := (new.fecha::text || ' ' || v_hora_inicio::text)::timestamp
    at time zone 'America/Argentina/Buenos_Aires';

  if now() > v_inicio_clase - interval '1 hour' then
    raise exception 'Ya pasó la ventana para liberar este turno (se cierra 1 hora antes del inicio).';
  end if;

  return new;
end;
$fn_validar_liberacion_turno$;

drop trigger if exists trg_validar_liberacion_turno on public.turnos_liberados;
create trigger trg_validar_liberacion_turno
  before insert on public.turnos_liberados
  for each row execute function public.fn_validar_liberacion_turno();

-- Ventana + regla de sede + cupo mensual al TOMAR un turno liberado (update
-- de tomado_por_id null -> valor). Global (todas las sedes juntas) a
-- propósito -- todavía no se sabe si el límite va a ser por sede.
create or replace function public.fn_validar_reclamo_turno_liberado()
returns trigger
language plpgsql
security definer set search_path = public
as $fn_validar_reclamo_turno_liberado$
declare
  v_hora_inicio time;
  v_inicio_clase timestamptz;
  v_max int;
  v_usados int;
begin
  -- Solo valida el camino "se está tomando un turno" (null -> valor). Otros
  -- updates (ej. el admin liberando manualmente el campo) no pasan por acá.
  if old.tomado_por_id is not null or new.tomado_por_id is null then
    return new;
  end if;

  if public.fn_current_role() = 'admin' then
    return new;
  end if;

  if new.tomado_por_id = new.alumno_original_id then
    raise exception 'No podés recuperar tu propio turno liberado.';
  end if;

  select hora_inicio into v_hora_inicio from public.clases where id = new.clase_id;
  v_inicio_clase := (new.fecha::text || ' ' || v_hora_inicio::text)::timestamp
    at time zone 'America/Argentina/Buenos_Aires';

  if now() > v_inicio_clase - interval '1 hour' then
    raise exception 'Ya pasó la ventana para tomar este turno (se cierra 1 hora antes del inicio).';
  end if;

  if exists (
    select 1 from public.inscripciones i
    where i.alumno_id = new.tomado_por_id and i.clase_id = new.clase_id and i.estado = 'activa'
  ) then
    raise exception 'Ya estás inscripta en esta clase -- la recuperación es para alumnas de otra clase de la misma sede.';
  end if;

  if not public.fn_alumno_en_sede_de_clase(new.clase_id) then
    raise exception 'Solo podés recuperar clases dentro de tu propia sede.';
  end if;

  select max_recuperaciones_por_mes into v_max from public.configuracion_recuperaciones where id = true;
  v_max := coalesce(v_max, 2);

  select count(*) into v_usados
  from public.turnos_liberados
  where tomado_por_id = new.tomado_por_id
    and date_trunc('month', fecha) = date_trunc('month', new.fecha);

  if v_usados >= v_max then
    raise exception 'Ya usaste tus % recuperaciones de este mes.', v_max;
  end if;

  return new;
end;
$fn_validar_reclamo_turno_liberado$;

drop trigger if exists trg_validar_reclamo_turno_liberado on public.turnos_liberados;
create trigger trg_validar_reclamo_turno_liberado
  before update on public.turnos_liberados
  for each row execute function public.fn_validar_reclamo_turno_liberado();

-- ---------------------------------------------------------------------------
-- RLS de turnos_liberados
-- ---------------------------------------------------------------------------
drop policy if exists "admin gestiona turnos liberados" on public.turnos_liberados;
create policy "admin gestiona turnos liberados"
  on public.turnos_liberados for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

drop policy if exists "profesor ve turnos liberados de sus clases" on public.turnos_liberados;
create policy "profesor ve turnos liberados de sus clases"
  on public.turnos_liberados for select
  using (exists (select 1 from public.clases c where c.id = clase_id and c.profesor_id = auth.uid()));

drop policy if exists "alumno ve turnos liberados relevantes" on public.turnos_liberados;
create policy "alumno ve turnos liberados relevantes"
  on public.turnos_liberados for select
  using (
    alumno_original_id = auth.uid()
    or tomado_por_id = auth.uid()
    or (tomado_por_id is null and public.fn_alumno_en_sede_de_clase(clase_id))
  );

drop policy if exists "alumno libera su propio turno" on public.turnos_liberados;
create policy "alumno libera su propio turno"
  on public.turnos_liberados for insert
  with check (
    alumno_original_id = auth.uid()
    and exists (
      select 1 from public.inscripciones i
      where i.alumno_id = auth.uid() and i.clase_id = clase_id and i.estado = 'activa'
    )
  );

drop policy if exists "alumno cancela su propio turno liberado sin tomar" on public.turnos_liberados;
create policy "alumno cancela su propio turno liberado sin tomar"
  on public.turnos_liberados for delete
  using (alumno_original_id = auth.uid() and tomado_por_id is null);

drop policy if exists "alumno toma un turno liberado de su sede" on public.turnos_liberados;
create policy "alumno toma un turno liberado de su sede"
  on public.turnos_liberados for update
  using (tomado_por_id is null and public.fn_alumno_en_sede_de_clase(clase_id))
  with check (tomado_por_id = auth.uid());

-- ---------------------------------------------------------------------------
-- fn_es_mi_alumno se redefine para que un profesor también pueda ver el
-- perfil de una alumna que tomó una recuperación en una de SUS clases
-- (aunque no esté inscripta ahí regularmente) -- sin esto, la fila de
-- asistencia de la recuperación existiría pero el profesor no podría
-- resolver el nombre de la alumna por RLS.
-- ---------------------------------------------------------------------------
create or replace function public.fn_es_mi_alumno(p_alumno_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn_es_mi_alumno$
  select exists (
    select 1
    from public.inscripciones i
    join public.clases c on c.id = i.clase_id
    where i.alumno_id = p_alumno_id
      and c.profesor_id = auth.uid()
      and i.estado in ('activa', 'lista_espera')
  )
  or exists (
    select 1
    from public.turnos_liberados t
    join public.clases c on c.id = t.clase_id
    where t.tomado_por_id = p_alumno_id
      and c.profesor_id = auth.uid()
  );
$fn_es_mi_alumno$;

-- ---------------------------------------------------------------------------
-- La alumna confirma su propia asistencia de RECUPERACIÓN: caso aparte del
-- de "alumno confirma su propia asistencia" (migración
-- 20260831120000_confirmacion_asistencia.sql), que exige estar inscripta en
-- esa clase puntual -- acá, en cambio, exige tener un turno_liberado tomado
-- para esa misma clase+fecha.
-- ---------------------------------------------------------------------------
drop policy if exists "alumno confirma asistencia de recuperacion tomada" on public.asistencias;
create policy "alumno confirma asistencia de recuperacion tomada"
  on public.asistencias for insert
  with check (
    alumno_id = auth.uid()
    and confirmado = true
    and estado is null
    and agregado_manualmente = false
    and no_registrado = false
    and es_recuperacion = true
    and exists (
      select 1 from public.turnos_liberados t
      where t.clase_id = clase_id and t.fecha = fecha and t.tomado_por_id = auth.uid()
    )
  );
