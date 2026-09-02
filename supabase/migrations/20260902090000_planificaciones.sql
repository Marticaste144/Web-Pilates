-- ============================================================================
-- MUV Gimnasia Postural — Planificaciones (individual + grupal)
--
-- Reemplaza el modelo incorrecto de rutinas_profesor (profesor -> rutina
-- propia) por el modelo real del negocio:
--   - Clase PERSONALIZADA: la planificación pertenece al ALUMNO. El profesor
--     es autor/responsable de crearla y mantenerla.
--   - Clase GRUPAL: la planificación pertenece a la CLASE (id real de
--     public.clases). Todos los alumnos anotados comparten UNA sola.
--
-- Es la MISMA estructura relacional para ambos casos (planificaciones con
-- alumno_id XOR clase_id) -- no se crean dos sistemas paralelos. Esta
-- migración crea el esquema completo (incluidas las policies de "grupal",
-- que empiezan a usarse recién en la Tarea 6) porque separar la creación de
-- una misma tabla en 2 migraciones no aporta nada.
--
-- Jerarquía (todas las tablas hijas guardan planificacion_id denormalizado,
-- además de su FK inmediata, para que la RLS de cada una sea un chequeo
-- directo en vez de tener que subir 3-4 JOINs cada vez):
--   planificaciones
--     └─ planificacion_dias (Día 1, Día 2, ... + estiramientos del día)
--         └─ planificacion_bloques (Acondicionamiento, Bloque 1, Bloque 2, ...)
--             └─ planificacion_ejercicios (Sentadilla, Plancha, ...)
--                 └─ planificacion_ejercicio_semanas (una fila por semana:
--                    carga/series/repeticiones/tiempo/PSE/observaciones)
--
-- SEMANA vs VERSIÓN (distinción central del diseño):
--   - "Semana" es progresión DENTRO de una misma planificación --
--     planificacion_ejercicio_semanas.numero_semana es un entero libre (no
--     hay columnas semana1_kg/semana2_kg/etc. hardcodeadas): agregar una
--     semana más no requiere ningún cambio de esquema.
--   - "Versión" es el HISTORIAL de planificaciones a lo largo del tiempo --
--     cada "nueva versión" es una fila nueva en planificaciones
--     (es_actual=true), la anterior pasa a es_actual=false y queda de solo
--     lectura (reforzado en RLS, no solo ocultando botones en la UI: las
--     policies de update de todas las tablas exigen es_actual=true).
--
-- Todos los valores de un ejercicio/semana (carga, series, repeticiones,
-- tiempo, pse) son TEXT a propósito: la planilla real de MUV mezcla
-- formatos ("10x2", "8", "6", "peso corporal") -- forzar numeric ahora
-- inventaría una convención que no está confirmada. observaciones cubre
-- casos como "usa tiempo en vez de repeticiones" sin necesitar una columna
-- por variante.
-- ============================================================================

create type public.tipo_planificacion as enum ('individual', 'grupal');

create table public.planificaciones (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_planificacion not null,
  alumno_id uuid references public.alumnos (profile_id) on delete cascade,
  clase_id uuid references public.clases (id) on delete cascade,
  es_actual boolean not null default true,
  version int not null default 1,
  version_anterior_id uuid references public.planificaciones (id) on delete set null,
  titulo text,
  objetivo_general text,
  observaciones text,
  creado_por uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_planificacion_owner check (
    (tipo = 'individual' and alumno_id is not null and clase_id is null)
    or (tipo = 'grupal' and clase_id is not null and alumno_id is null)
  )
);

comment on table public.planificaciones is
  'Una fila por VERSIÓN de planificación (individual de un alumno, o grupal de una clase). es_actual=true es la vigente; el resto es historial de solo lectura. Reemplaza el modelo incorrecto de rutinas_profesor.';
comment on column public.planificaciones.version_anterior_id is
  'De qué versión se copió esta (si se creó "basada en la actual") -- null si se creó desde cero. Solo metadata/trazabilidad, no hay comparación automática todavía.';
comment on column public.planificaciones.creado_por is
  'Profesor autor de ESTA versión puntual -- inmutable una vez creada, aunque después otro profesor autorizado edite el contenido.';

-- A lo sumo una versión "actual" por alumno y por clase (nunca "exactamente
-- una": un alumno/clase sin ninguna planificación todavía no tiene fila).
create unique index uq_planificacion_actual_alumno on public.planificaciones (alumno_id) where es_actual and alumno_id is not null;
create unique index uq_planificacion_actual_clase on public.planificaciones (clase_id) where es_actual and clase_id is not null;
create index idx_planificaciones_alumno on public.planificaciones (alumno_id, created_at desc);
create index idx_planificaciones_clase on public.planificaciones (clase_id, created_at desc);

create trigger trg_planificaciones_updated_at
  before update on public.planificaciones
  for each row execute function public.fn_set_updated_at();

create table public.planificacion_dias (
  id uuid primary key default gen_random_uuid(),
  planificacion_id uuid not null references public.planificaciones (id) on delete cascade,
  nombre text not null default 'Día 1',
  estiramientos text,
  orden int not null default 0,
  created_at timestamptz not null default now()
);

comment on column public.planificacion_dias.estiramientos is
  'Texto libre (ej. "Rotadores, isquiotibiales, rodillo") -- en la planilla real es una línea descriptiva al pie del día, no una lista de ejercicios con series/semanas.';

create index idx_planificacion_dias_planificacion on public.planificacion_dias (planificacion_id, orden);

create table public.planificacion_bloques (
  id uuid primary key default gen_random_uuid(),
  planificacion_id uuid not null references public.planificaciones (id) on delete cascade,
  dia_id uuid not null references public.planificacion_dias (id) on delete cascade,
  nombre text not null default 'Bloque',
  orden int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.planificacion_bloques is
  '"Acondicionamiento" no es un tipo especial -- es simplemente el primer bloque, con el nombre que le ponga el profesor (igual que "Bloque 1"/"Bloque 2"). Nombre y orden totalmente editables.';

create index idx_planificacion_bloques_planificacion on public.planificacion_bloques (planificacion_id);
create index idx_planificacion_bloques_dia on public.planificacion_bloques (dia_id, orden);

create table public.planificacion_ejercicios (
  id uuid primary key default gen_random_uuid(),
  planificacion_id uuid not null references public.planificaciones (id) on delete cascade,
  bloque_id uuid not null references public.planificacion_bloques (id) on delete cascade,
  nombre text not null default 'Ejercicio',
  orden int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_planificacion_ejercicios_planificacion on public.planificacion_ejercicios (planificacion_id);
create index idx_planificacion_ejercicios_bloque on public.planificacion_ejercicios (bloque_id, orden);

create table public.planificacion_ejercicio_semanas (
  id uuid primary key default gen_random_uuid(),
  planificacion_id uuid not null references public.planificaciones (id) on delete cascade,
  ejercicio_id uuid not null references public.planificacion_ejercicios (id) on delete cascade,
  numero_semana int not null check (numero_semana > 0),
  carga text,
  series text,
  repeticiones text,
  tiempo text,
  pse text,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ejercicio_id, numero_semana)
);

comment on column public.planificacion_ejercicio_semanas.pse is
  'Percepción Subjetiva de Esfuerzo, tal como la carga la propia planilla de MUV (columna PSE) -- texto libre, no se asume una escala fija.';

create index idx_planificacion_semanas_planificacion on public.planificacion_ejercicio_semanas (planificacion_id);
create index idx_planificacion_semanas_ejercicio on public.planificacion_ejercicio_semanas (ejercicio_id, numero_semana);

create trigger trg_planificacion_semanas_updated_at
  before update on public.planificacion_ejercicio_semanas
  for each row execute function public.fn_set_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================

-- ¿El profesor logueado tiene a p_alumno_id como alumno propio (inscripción
-- directa) Y ese alumno es visible (tuvo alguna cuota aprobada)? A propósito
-- MÁS ESTRICTA que fn_es_mi_alumno: esa función ya incluye el caso de
-- suplencia (extendida en la Tarea 5 del bloque de suplencias) y el de
-- recuperación tomada -- acá NO se reutiliza para no ampliar el acceso a
-- planificaciones a suplentes todavía sin que se haya pedido explícitamente
-- (queda anotado como pendiente a evaluar más adelante).
create or replace function public.fn_profesor_autoriza_alumno_planificacion(p_alumno_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn_profesor_autoriza_alumno_planificacion$
  select exists (
    select 1
    from public.inscripciones i
    join public.clases c on c.id = i.clase_id
    where i.alumno_id = p_alumno_id
      and c.profesor_id = auth.uid()
      and i.estado in ('activa', 'lista_espera')
  );
$fn_profesor_autoriza_alumno_planificacion$;

-- ¿La clase p_clase_id es una clase propia del profesor logueado? (no
-- incluye suplencia, mismo criterio que la función de arriba.)
create or replace function public.fn_profesor_autoriza_clase_planificacion(p_clase_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn_profesor_autoriza_clase_planificacion$
  select exists (
    select 1 from public.clases c
    where c.id = p_clase_id and c.profesor_id = auth.uid()
  );
$fn_profesor_autoriza_clase_planificacion$;

-- Punto único de autorización para las tablas hijas (dias/bloques/
-- ejercicios/semanas): resuelve el tipo/dueño de la planificación y, si
-- p_requiere_actual, exige además que sea la vigente -- así "solo lectura"
-- para versiones históricas queda reforzado en la base, no solo ocultando
-- botones en la UI.
create or replace function public.fn_planificacion_autorizada(p_planificacion_id uuid, p_requiere_actual boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $fn_planificacion_autorizada$
declare
  v_tipo public.tipo_planificacion;
  v_alumno_id uuid;
  v_clase_id uuid;
  v_es_actual boolean;
begin
  select tipo, alumno_id, clase_id, es_actual
  into v_tipo, v_alumno_id, v_clase_id, v_es_actual
  from public.planificaciones
  where id = p_planificacion_id;

  if v_tipo is null then
    return false;
  end if;

  if p_requiere_actual and not v_es_actual then
    return false;
  end if;

  if public.fn_current_role() = 'admin' then
    return true;
  end if;

  if v_tipo = 'individual' then
    return public.fn_profesor_autoriza_alumno_planificacion(v_alumno_id) and public.fn_alumno_visible(v_alumno_id);
  else
    return public.fn_profesor_autoriza_clase_planificacion(v_clase_id);
  end if;
end;
$fn_planificacion_autorizada$;

alter table public.planificaciones enable row level security;
alter table public.planificacion_dias enable row level security;
alter table public.planificacion_bloques enable row level security;
alter table public.planificacion_ejercicios enable row level security;
alter table public.planificacion_ejercicio_semanas enable row level security;

-- ---- planificaciones ------------------------------------------------------
create policy "admin gestiona planificaciones"
  on public.planificaciones for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

create policy "profesor ve planificaciones individuales autorizadas"
  on public.planificaciones for select
  using (
    tipo = 'individual'
    and public.fn_profesor_autoriza_alumno_planificacion(alumno_id)
    and public.fn_alumno_visible(alumno_id)
  );

create policy "profesor crea planificaciones individuales autorizadas"
  on public.planificaciones for insert
  with check (
    tipo = 'individual'
    and public.fn_profesor_autoriza_alumno_planificacion(alumno_id)
    and public.fn_alumno_visible(alumno_id)
    and creado_por = auth.uid()
  );

-- El using exige es_actual=true: una vez que una versión deja de ser la
-- vigente, ningún profesor puede volver a tocarla -- ni siquiera para poner
-- es_actual=false es necesario acá (eso lo hace el profesor JUSTO ANTES de
-- que deje de ser actual, cuando todavía lo es).
create policy "profesor actualiza planificacion individual actual autorizada"
  on public.planificaciones for update
  using (
    tipo = 'individual'
    and es_actual
    and public.fn_profesor_autoriza_alumno_planificacion(alumno_id)
    and public.fn_alumno_visible(alumno_id)
  )
  with check (
    tipo = 'individual'
    and public.fn_profesor_autoriza_alumno_planificacion(alumno_id)
    and public.fn_alumno_visible(alumno_id)
  );

-- Policies "grupal" -- empiezan a usarse en la Tarea 6, se crean ahora junto
-- con el resto del esquema para no fragmentar la misma tabla en 2 migraciones.
create policy "profesor ve planificaciones grupales de sus clases"
  on public.planificaciones for select
  using (tipo = 'grupal' and public.fn_profesor_autoriza_clase_planificacion(clase_id));

create policy "profesor crea planificaciones grupales de sus clases"
  on public.planificaciones for insert
  with check (
    tipo = 'grupal'
    and public.fn_profesor_autoriza_clase_planificacion(clase_id)
    and creado_por = auth.uid()
  );

create policy "profesor actualiza planificacion grupal actual de sus clases"
  on public.planificaciones for update
  using (tipo = 'grupal' and es_actual and public.fn_profesor_autoriza_clase_planificacion(clase_id))
  with check (tipo = 'grupal' and public.fn_profesor_autoriza_clase_planificacion(clase_id));

-- ---- planificacion_dias / bloques / ejercicios / semanas ------------------
-- Mismas 4 policies (select/insert/update/delete), repetidas idénticas en
-- las 4 tablas hijas -- todas delegan en fn_planificacion_autorizada, que ya
-- resuelve admin/individual/grupal y la regla de "solo lectura si no es la
-- actual".
create policy "acceso dias segun planificacion"
  on public.planificacion_dias for select
  using (public.fn_planificacion_autorizada(planificacion_id, false));
create policy "crear dias en planificacion actual autorizada"
  on public.planificacion_dias for insert
  with check (public.fn_planificacion_autorizada(planificacion_id, true));
create policy "editar dias en planificacion actual autorizada"
  on public.planificacion_dias for update
  using (public.fn_planificacion_autorizada(planificacion_id, true))
  with check (public.fn_planificacion_autorizada(planificacion_id, true));
create policy "borrar dias en planificacion actual autorizada"
  on public.planificacion_dias for delete
  using (public.fn_planificacion_autorizada(planificacion_id, true));

create policy "acceso bloques segun planificacion"
  on public.planificacion_bloques for select
  using (public.fn_planificacion_autorizada(planificacion_id, false));
create policy "crear bloques en planificacion actual autorizada"
  on public.planificacion_bloques for insert
  with check (public.fn_planificacion_autorizada(planificacion_id, true));
create policy "editar bloques en planificacion actual autorizada"
  on public.planificacion_bloques for update
  using (public.fn_planificacion_autorizada(planificacion_id, true))
  with check (public.fn_planificacion_autorizada(planificacion_id, true));
create policy "borrar bloques en planificacion actual autorizada"
  on public.planificacion_bloques for delete
  using (public.fn_planificacion_autorizada(planificacion_id, true));

create policy "acceso ejercicios segun planificacion"
  on public.planificacion_ejercicios for select
  using (public.fn_planificacion_autorizada(planificacion_id, false));
create policy "crear ejercicios en planificacion actual autorizada"
  on public.planificacion_ejercicios for insert
  with check (public.fn_planificacion_autorizada(planificacion_id, true));
create policy "editar ejercicios en planificacion actual autorizada"
  on public.planificacion_ejercicios for update
  using (public.fn_planificacion_autorizada(planificacion_id, true))
  with check (public.fn_planificacion_autorizada(planificacion_id, true));
create policy "borrar ejercicios en planificacion actual autorizada"
  on public.planificacion_ejercicios for delete
  using (public.fn_planificacion_autorizada(planificacion_id, true));

create policy "acceso semanas segun planificacion"
  on public.planificacion_ejercicio_semanas for select
  using (public.fn_planificacion_autorizada(planificacion_id, false));
create policy "crear semanas en planificacion actual autorizada"
  on public.planificacion_ejercicio_semanas for insert
  with check (public.fn_planificacion_autorizada(planificacion_id, true));
create policy "editar semanas en planificacion actual autorizada"
  on public.planificacion_ejercicio_semanas for update
  using (public.fn_planificacion_autorizada(planificacion_id, true))
  with check (public.fn_planificacion_autorizada(planificacion_id, true));
create policy "borrar semanas en planificacion actual autorizada"
  on public.planificacion_ejercicio_semanas for delete
  using (public.fn_planificacion_autorizada(planificacion_id, true));

-- ============================================================================
-- Deprecación segura de rutinas_profesor (modelo incorrecto: "profesor ->
-- rutina propia" no existe como concepto de negocio). Verificado antes de
-- escribir esta migración: la tabla está VACÍA (0 filas) y el bucket
-- "rutinas" no tiene ningún archivo subido -- no hay nada que preservar ni
-- que informar como dato existente. Por eso alcanza con dejar de usarla
-- desde la app (ver commit de esta tarea) y documentarlo acá -- NO se hace
-- DROP: la tabla/policies quedan tal cual, inertes, por si en el futuro se
-- decide reutilizar el bucket "rutinas" como adjunto de una planificación.
-- ============================================================================
comment on table public.rutinas_profesor is
  'DEPRECADA (partía de un modelo de negocio incorrecto: no existe "profesor -> rutina propia" como concepto general). Verificada vacía (0 filas) al deprecarla -- reemplazada por public.planificaciones (planificación por alumno o por clase). No se borra la tabla para no hacer un DROP destructivo sin necesidad; el bucket de Storage "rutinas" tampoco se toca.';
