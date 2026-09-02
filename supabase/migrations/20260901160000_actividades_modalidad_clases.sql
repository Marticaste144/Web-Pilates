-- ============================================================================
-- MUV Gimnasia Postural — Actividades por sede + modalidad de clase
--
-- El modelo viejo asumía sede = actividad (1 a 1): "MUV POSTURAL",
-- "MUV PILATES", "MUV FITNESS" eran a la vez el nombre de la sede Y el
-- único servicio que se dictaba ahí. La estructura real es otra: la sede es
-- el LOCAL físico, y cada local ofrece VARIAS actividades independientes:
--   - MUV POSTURAL (calle 55): Postural, Funcional
--   - MUV PILATES  (calle 56): Pilates
--   - MUV FITNESS  (calle 59): Funcional, Stretching, Fuerza, Ritmo
-- (Funcional/Stretching/Fuerza/Ritmo son 4 actividades independientes -- NO
-- se agrupan como una sola "Fitness".)
--
-- No se renombra ninguna sede (siguen siendo "MUV POSTURAL"/"MUV PILATES"/
-- "MUV FITNESS", la identidad de marca que ya se usa en toda la app y en la
-- landing) -- son exactamente los mismos 3 locales de siempre, identificados
-- acá con las direcciones/números de calle que usó la admin para describir
-- la estructura real (55/56/59).
--
-- También se agrega "modalidad" a clases (personalizada/grupal): es un dato
-- de la clase puntual, no de la sede ni de la actividad -- una sede/
-- actividad puede tener turnos de las dos modalidades.
--
-- Ambas columnas nuevas en clases quedan NULLABLE a propósito: las clases
-- que ya existen no tienen forma confiable de saber a qué actividad
-- pertenecen (ej. una clase vieja de MUV POSTURAL podría ser Postural O
-- Funcional -- no hay dato que lo distinga) ni qué modalidad tienen -- se
-- deja que la admin las complete a mano desde /admin/clases, en vez de
-- adivinar y arriesgarse a dejar un dato incorrecto. Nada de esto rompe
-- inscripciones, asistencia, cupo ni ninguna regla existente: son columnas
-- nuevas, no se toca ninguna existente.
-- ============================================================================

create table public.actividades (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.actividades is
  'Actividades independientes que se dictan en las sedes -- Postural, Funcional, Pilates, Stretching, Fuerza, Ritmo. Funcional/Stretching/Fuerza/Ritmo son 4 actividades distintas, no una sola "Fitness".';

insert into public.actividades (nombre)
values ('Postural'), ('Funcional'), ('Pilates'), ('Stretching'), ('Fuerza'), ('Ritmo')
on conflict (nombre) do nothing;

alter table public.actividades enable row level security;

create policy "autenticados ven actividades"
  on public.actividades for select to authenticated using (true);

create policy "admin gestiona actividades"
  on public.actividades for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

-- ---------------------------------------------------------------------------
-- Qué actividades ofrece cada sede -- many-to-many. Se usa para filtrar el
-- desplegable de "Actividad" en el formulario de clases según la sede
-- elegida (una clase de MUV PILATES no debería poder cargarse como
-- "Stretching", por ejemplo).
-- ---------------------------------------------------------------------------
create table public.sede_actividades (
  sede_id uuid not null references public.sedes (id) on delete cascade,
  actividad_id uuid not null references public.actividades (id) on delete cascade,
  primary key (sede_id, actividad_id)
);

comment on table public.sede_actividades is
  'Qué actividades se dictan en cada sede -- MUV POSTURAL: Postural+Funcional; MUV PILATES: Pilates; MUV FITNESS: Funcional+Stretching+Fuerza+Ritmo.';

alter table public.sede_actividades enable row level security;

create policy "autenticados ven sede_actividades"
  on public.sede_actividades for select to authenticated using (true);

create policy "admin gestiona sede_actividades"
  on public.sede_actividades for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

insert into public.sede_actividades (sede_id, actividad_id)
select s.id, a.id
from public.sedes s
join public.actividades a on (
  (s.nombre = 'MUV POSTURAL' and a.nombre in ('Postural', 'Funcional'))
  or (s.nombre = 'MUV PILATES' and a.nombre = 'Pilates')
  or (s.nombre = 'MUV FITNESS' and a.nombre in ('Funcional', 'Stretching', 'Fuerza', 'Ritmo'))
)
on conflict (sede_id, actividad_id) do nothing;

-- ---------------------------------------------------------------------------
-- Modalidad de la clase (personalizada/grupal) -- pertenece a la clase
-- puntual, no se asume por sede ni por actividad.
-- ---------------------------------------------------------------------------
create type public.modalidad_clase as enum ('personalizada', 'grupal');

alter table public.clases
  add column if not exists actividad_id uuid references public.actividades (id) on delete restrict,
  add column if not exists modalidad public.modalidad_clase;

comment on column public.clases.actividad_id is
  'Null en clases viejas (no se puede adivinar cuál de las actividades de la sede era) -- la admin la completa a mano.';
comment on column public.clases.modalidad is
  'personalizada | grupal, null en clases viejas hasta que la admin la confirme. No se infiere de sede/actividad.';
