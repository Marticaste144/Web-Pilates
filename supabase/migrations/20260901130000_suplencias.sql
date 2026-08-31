-- ============================================================================
-- MUV Gimnasia Postural — Suplencias (acceso de un profesor a los alumnos de otro)
--
-- Cuando un profesor reemplaza a otro, necesita ver la lista de alumnos y la
-- ficha de evaluación de TODAS las sedes/clases del profesor reemplazado
-- (no solo la clase puntual), para estar al tanto de cada uno antes de dar
-- la clase. Por ahora es acceso de LECTURA (roster, asistencias históricas,
-- fichas) -- no incluye poder tomar asistencia en clases ajenas, eso queda
-- para más adelante si hace falta.
--
-- El admin carga/gestiona la suplencia (profesor_original, profesor_suplente,
-- rango de fechas -- sin fecha_fin = indefinida) y puede desactivarla en
-- cualquier momento con "activa=false"; el acceso del suplente nunca es
-- permanente por default, solo mientras la fila esté activa Y hoy caiga
-- dentro del rango.
-- ============================================================================

create table public.suplencias (
  id uuid primary key default gen_random_uuid(),
  profesor_original uuid not null references public.profesores (profile_id) on delete cascade,
  profesor_suplente uuid not null references public.profesores (profile_id) on delete cascade,
  fecha_inicio date not null default current_date,
  fecha_fin date, -- null = indefinida (hasta que el admin la desactive a mano)
  activa boolean not null default true,
  creado_por uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (profesor_original <> profesor_suplente),
  check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

comment on table public.suplencias is
  'Mientras una fila esté activa=true y hoy caiga en [fecha_inicio, fecha_fin] (o fecha_fin sea null), profesor_suplente tiene el mismo acceso de LECTURA que profesor_original a sus alumnos/roster/asistencias/fichas -- ver fn_es_suplente_de.';

create index idx_suplencias_suplente on public.suplencias (profesor_suplente, activa);
create index idx_suplencias_original on public.suplencias (profesor_original, activa);

alter table public.suplencias enable row level security;

create policy "admin gestiona suplencias"
  on public.suplencias for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

create policy "profesor ve suplencias donde participa"
  on public.suplencias for select
  using (profesor_original = auth.uid() or profesor_suplente = auth.uid());

-- ¿El usuario logueado es suplente ACTIVO de p_profesor_original ahora mismo?
create or replace function public.fn_es_suplente_de(p_profesor_original uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.suplencias s
    where s.profesor_suplente = auth.uid()
      and s.profesor_original = p_profesor_original
      and s.activa
      and current_date >= s.fecha_inicio
      and (s.fecha_fin is null or current_date <= s.fecha_fin)
  );
$$;

-- fn_es_mi_alumno se redefine una vez más (ver migraciones
-- 20260831120000 y 20260901120000) para agregar el caso de suplencia --
-- este único cambio se propaga solo a TODAS las policies que ya dependen de
-- esta función: profiles, alumnos, fichas_evaluacion, ficha_evaluacion_notas.
create or replace function public.fn_es_mi_alumno(p_alumno_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
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
  )
  or exists (
    select 1
    from public.inscripciones i
    join public.clases c on c.id = i.clase_id
    where i.alumno_id = p_alumno_id
      and i.estado in ('activa', 'lista_espera')
      and public.fn_es_suplente_de(c.profesor_id)
  );
$$;

-- inscripciones/asistencias: el profesor original ya podía ver el roster y
-- las asistencias de SUS clases -- se agrega el mismo acceso para el
-- suplente sobre las clases del profesor que está cubriendo (roster completo
-- de todas sus sedes/clases, no solo una puntual).
drop policy if exists "profesor ve inscripciones de sus clases" on public.inscripciones;
create policy "profesor ve inscripciones de sus clases"
  on public.inscripciones for select
  using (
    exists (select 1 from public.clases c where c.id = clase_id and c.profesor_id = auth.uid())
    or exists (select 1 from public.clases c where c.id = clase_id and public.fn_es_suplente_de(c.profesor_id))
  );

drop policy if exists "profesor ve asistencias de sus clases" on public.asistencias;
create policy "profesor ve asistencias de sus clases"
  on public.asistencias for select
  using (
    exists (select 1 from public.clases c where c.id = clase_id and c.profesor_id = auth.uid())
    or exists (select 1 from public.clases c where c.id = clase_id and public.fn_es_suplente_de(c.profesor_id))
  );
