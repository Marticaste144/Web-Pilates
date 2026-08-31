-- ============================================================================
-- MUV Gimnasia Postural — Ficha de evaluación del alumno
--
-- Dos tablas a propósito, no una sola con columnas sueltas:
--   1) fichas_evaluacion: una fila por alumno con el estado "actual" de la
--      ficha (hoy solo dolores_molestias, pero pensada para sumar más
--      columnas específicas más adelante sin romper nada -- todavía no se
--      confirmó con la clienta el detalle exacto).
--   2) ficha_evaluacion_notas: historial de evolución/seguimiento, append-only
--      (se agregan notas fechadas, nunca se editan ni se borran las viejas)
--      -- separado de (1) porque un historial no es "un campo más" de la
--      ficha, es una lista que crece.
-- Los datos personales del alumno (nombre, email, teléfono) NO se duplican
-- acá -- se siguen leyendo de profiles, mismo criterio que el resto de la app.
-- ============================================================================

create table public.fichas_evaluacion (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null unique references public.alumnos (profile_id) on delete cascade,
  dolores_molestias text,
  actualizado_por uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.fichas_evaluacion is
  'Una fila por alumno (upsert por alumno_id). Extensible: sumar una columna acá no requiere tocar el historial de notas.';

create trigger trg_fichas_evaluacion_updated_at
  before update on public.fichas_evaluacion
  for each row execute function public.fn_set_updated_at();

create table public.ficha_evaluacion_notas (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.alumnos (profile_id) on delete cascade,
  autor_id uuid references public.profiles (id),
  contenido text not null check (char_length(btrim(contenido)) between 1 and 2000),
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);

comment on table public.ficha_evaluacion_notas is
  'Historial de entradas fechadas de evolución/seguimiento -- append-only (sin policy de update/delete a propósito).';

create index idx_ficha_evaluacion_notas_alumno on public.ficha_evaluacion_notas (alumno_id, fecha desc, created_at desc);

alter table public.fichas_evaluacion enable row level security;
alter table public.ficha_evaluacion_notas enable row level security;

-- ---- admin: gestión completa (lectura + edición), igual que el resto de la app --
create policy "admin gestiona fichas de evaluacion"
  on public.fichas_evaluacion for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

create policy "admin gestiona notas de evaluacion"
  on public.ficha_evaluacion_notas for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

-- ---- profesor: solo de sus alumnos visibles (mismo criterio que el resto de
-- la app: fn_es_mi_alumno + fn_alumno_visible). fn_es_mi_alumno es una sola
-- función compartida por todas estas policies -- si más adelante se amplía
-- (recuperaciones, suplencias, etc.) el cambio se hace una sola vez ahí y
-- se propaga solo a fichas/notas sin tocar nada acá. --
create policy "profesor ve fichas de sus alumnos"
  on public.fichas_evaluacion for select
  using (public.fn_es_mi_alumno(alumno_id) and public.fn_alumno_visible(alumno_id));

create policy "profesor crea ficha de sus alumnos"
  on public.fichas_evaluacion for insert
  with check (public.fn_es_mi_alumno(alumno_id) and public.fn_alumno_visible(alumno_id));

create policy "profesor actualiza ficha de sus alumnos"
  on public.fichas_evaluacion for update
  using (public.fn_es_mi_alumno(alumno_id) and public.fn_alumno_visible(alumno_id))
  with check (public.fn_es_mi_alumno(alumno_id) and public.fn_alumno_visible(alumno_id));

create policy "profesor ve notas de sus alumnos"
  on public.ficha_evaluacion_notas for select
  using (public.fn_es_mi_alumno(alumno_id) and public.fn_alumno_visible(alumno_id));

create policy "profesor agrega notas a sus alumnos"
  on public.ficha_evaluacion_notas for insert
  with check (public.fn_es_mi_alumno(alumno_id) and public.fn_alumno_visible(alumno_id));
