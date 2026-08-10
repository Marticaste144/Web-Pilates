-- ============================================================================
-- MUV Gimnasia Postural — Esquema inicial
-- Tablas: sedes, profiles, profesores, alumnos, aranceles, clases,
-- inscripciones, pagos, pagos_auditoria, asistencias, avisos, avisos_sedes
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------------
create type public.rol_usuario as enum ('admin', 'profesor', 'alumno');
create type public.estado_inscripcion as enum ('activa', 'lista_espera', 'baja');
create type public.medio_pago as enum ('mercadopago', 'efectivo');
create type public.estado_pago as enum ('pendiente', 'procesando', 'aprobado', 'rechazado');
create type public.estado_asistencia as enum ('presente', 'ausente');

-- ---------------------------------------------------------------------------
-- sedes
-- ---------------------------------------------------------------------------
create table public.sedes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.sedes is 'Las 3 sedes del centro: MUV FITNESS, MUV POSTURAL, MUV PILATES.';

-- ---------------------------------------------------------------------------
-- profiles: fila 1:1 con auth.users, común a los 3 roles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.rol_usuario not null,
  nombre text not null,
  apellido text not null,
  telefono text,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Datos personales + rol de cada usuario autenticado (admin/profesor/alumno).';

-- ---------------------------------------------------------------------------
-- profesores: extensión de profiles para role = 'profesor'
-- ---------------------------------------------------------------------------
create table public.profesores (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column public.profesores.activo is 'Permite desactivar un profesor sin borrar su historial de clases/asistencias.';

-- ---------------------------------------------------------------------------
-- alumnos: extensión de profiles para role = 'alumno'
-- ---------------------------------------------------------------------------
create table public.alumnos (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.alumnos is
  'La visibilidad del alumno para los profesores (recién aparece con su primera cuota aprobada) '
  'se calcula al vuelo -- ver vista v_estado_cuota_alumno_sede -- no se guarda como flag para evitar desincronización.';

-- ---------------------------------------------------------------------------
-- aranceles: valor de cuota por sede + frecuencia semanal, con historial
-- ---------------------------------------------------------------------------
create table public.aranceles (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references public.sedes (id) on delete cascade,
  clases_por_semana smallint not null check (clases_por_semana between 1 and 4),
  valor_mensual numeric(10, 2) not null check (valor_mensual > 0),
  vigente_desde date not null default current_date,
  created_at timestamptz not null default now(),
  unique (sede_id, clases_por_semana, vigente_desde)
);

comment on column public.aranceles.vigente_desde is
  'Un aumento se carga como fila nueva (no se pisa la anterior), así se conserva el historial de precios.';

-- ---------------------------------------------------------------------------
-- clases: plantilla fija sede + día + horario + profesor
-- ---------------------------------------------------------------------------
create table public.clases (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references public.sedes (id) on delete restrict,
  profesor_id uuid not null references public.profesores (profile_id) on delete restrict,
  dia_semana smallint not null check (dia_semana between 1 and 7), -- 1=lunes .. 7=domingo (ISO 8601)
  hora_inicio time not null,
  hora_fin time not null check (hora_fin > hora_inicio),
  cupo smallint not null default 8 check (cupo > 0),
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_clases_sede on public.clases (sede_id);
create index idx_clases_profesor on public.clases (profesor_id);
create index idx_clases_horario on public.clases (sede_id, dia_semana, hora_inicio);

-- ---------------------------------------------------------------------------
-- inscripciones
-- ---------------------------------------------------------------------------
create table public.inscripciones (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.alumnos (profile_id) on delete cascade,
  clase_id uuid not null references public.clases (id) on delete cascade,
  estado public.estado_inscripcion not null default 'activa',
  posicion_espera smallint, -- orden FIFO dentro de la lista de espera de esa clase
  fecha_inscripcion timestamptz not null default now(),
  fecha_baja timestamptz,
  created_at timestamptz not null default now()
);

create index idx_inscripciones_alumno on public.inscripciones (alumno_id);
create index idx_inscripciones_clase on public.inscripciones (clase_id);

-- Un alumno no puede tener dos inscripciones activas/en espera a la misma clase
create unique index uq_inscripcion_vigente_por_clase
  on public.inscripciones (alumno_id, clase_id)
  where estado in ('activa', 'lista_espera');

-- ---------------------------------------------------------------------------
-- pagos: una fila por intento de cobro de la cuota mensual (alumno + sede)
-- ---------------------------------------------------------------------------
create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.alumnos (profile_id) on delete cascade,
  sede_id uuid not null references public.sedes (id) on delete restrict,
  frecuencia_semanal smallint not null check (frecuencia_semanal between 1 and 4),
  monto numeric(10, 2) not null check (monto > 0),
  medio public.medio_pago not null,
  estado public.estado_pago not null default 'pendiente',
  mercadopago_payment_id text,
  comprobante_url text, -- path en Supabase Storage
  marcado_por uuid references public.profiles (id), -- quién lo marcó pagado en efectivo
  marcado_en timestamptz,
  -- aprobado_en y vencimiento NO se cargan a mano: los calcula
  -- fn_calcular_vencimiento_pago (más abajo) en cuanto estado pasa a 'aprobado'.
  aprobado_en timestamptz,
  vencimiento date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pagos is
  'Cada intento de pago es una fila propia (no se pisa): permite el historial completo de la sección 7 del doc.';

comment on column public.pagos.vencimiento is
  'Ciclo rodante: aprobado_en + 1 mes (no un día fijo del calendario). Si el alumno paga tarde, '
  'el próximo vencimiento también se corre -- ver fn_calcular_vencimiento_pago.';

create index idx_pagos_alumno_sede_aprobado on public.pagos (alumno_id, sede_id, aprobado_en);

-- ---------------------------------------------------------------------------
-- pagos_auditoria: trazabilidad de cambios de estado (sobre todo manuales)
-- ---------------------------------------------------------------------------
create table public.pagos_auditoria (
  id uuid primary key default gen_random_uuid(),
  pago_id uuid not null references public.pagos (id) on delete cascade,
  estado_anterior public.estado_pago,
  estado_nuevo public.estado_pago not null,
  realizado_por uuid references public.profiles (id),
  detalle text,
  created_at timestamptz not null default now()
);

create index idx_pagos_auditoria_pago on public.pagos_auditoria (pago_id);

-- ---------------------------------------------------------------------------
-- asistencias: una fila por clase + alumno + fecha de esa sesión semanal
-- ---------------------------------------------------------------------------
create table public.asistencias (
  id uuid primary key default gen_random_uuid(),
  clase_id uuid not null references public.clases (id) on delete cascade,
  alumno_id uuid not null references public.alumnos (profile_id) on delete cascade,
  fecha date not null,
  estado public.estado_asistencia, -- null = todavía no se tomó asistencia
  tomado_por uuid references public.profesores (profile_id),
  tomado_en timestamptz,
  created_at timestamptz not null default now(),
  unique (clase_id, alumno_id, fecha)
);

create index idx_asistencias_clase_fecha on public.asistencias (clase_id, fecha);

-- ---------------------------------------------------------------------------
-- avisos (+ segmentación por sede)
-- ---------------------------------------------------------------------------
create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  mensaje text not null,
  todas_las_sedes boolean not null default true,
  fecha_inicio date not null,
  fecha_fin date not null check (fecha_fin >= fecha_inicio),
  publicado_por uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.avisos_sedes (
  aviso_id uuid not null references public.avisos (id) on delete cascade,
  sede_id uuid not null references public.sedes (id) on delete cascade,
  primary key (aviso_id, sede_id)
);

comment on table public.avisos_sedes is
  'Solo se completa cuando avisos.todas_las_sedes = false. Un aviso bloquea TODA actividad '
  '(inscripción, baja, asistencia) de las clases de la(s) sede(s) afectada(s) en su rango de fechas.';

create index idx_avisos_fechas on public.avisos (fecha_inicio, fecha_fin);

-- ============================================================================
-- Funciones y triggers
-- ============================================================================

-- Mantiene updated_at al día
create or replace function public.fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.fn_set_updated_at();

create trigger trg_pagos_updated_at
  before update on public.pagos
  for each row execute function public.fn_set_updated_at();

-- Calcula aprobado_en/vencimiento de un pago -- nadie los carga a mano.
-- Regla del negocio: el vencimiento de la PRÓXIMA cuota = fecha en que se
-- aprobó ESTE pago + 1 mes (ciclo rodante, no un día fijo del calendario:
-- si el alumno paga tarde, el próximo vencimiento también se corre).
-- Cualquier valor de aprobado_en/vencimiento que llegue en el insert/update
-- se ignora y se recalcula acá, para que no se puedan pisar a mano.
create or replace function public.fn_calcular_vencimiento_pago()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'aprobado' then
    if new.aprobado_en is null then
      new.aprobado_en := now();
    end if;
    new.vencimiento := (new.aprobado_en::date + interval '1 month')::date;
  else
    new.aprobado_en := null;
    new.vencimiento := null;
  end if;

  return new;
end;
$$;

create trigger trg_pagos_calcular_vencimiento
  before insert or update on public.pagos
  for each row execute function public.fn_calcular_vencimiento_pago();

-- Crea automáticamente la fila de profiles (+ profesores/alumnos) al registrarse
-- en Supabase Auth. Lee "role", "nombre", "apellido", "telefono" de los metadatos
-- pasados en el signUp(); si no viene role, asume 'alumno' (autoregistro público).
create or replace function public.fn_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role public.rol_usuario;
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::public.rol_usuario, 'alumno');

  insert into public.profiles (id, role, nombre, apellido, telefono, email)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    coalesce(new.raw_user_meta_data ->> 'apellido', ''),
    new.raw_user_meta_data ->> 'telefono',
    new.email
  );

  if v_role = 'alumno' then
    insert into public.alumnos (profile_id) values (new.id);
  elsif v_role = 'profesor' then
    insert into public.profesores (profile_id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_handle_new_user();

-- Límite de 4 clases activas por semana, por sede (sección 5 y respuesta 4)
create or replace function public.fn_validar_limite_clases_semana()
returns trigger
language plpgsql
as $$
declare
  v_sede_id uuid;
  v_count int;
begin
  if new.estado <> 'activa' then
    return new;
  end if;

  select sede_id into v_sede_id from public.clases where id = new.clase_id;

  select count(*) into v_count
  from public.inscripciones i
  join public.clases c on c.id = i.clase_id
  where i.alumno_id = new.alumno_id
    and c.sede_id = v_sede_id
    and i.estado = 'activa'
    and i.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if v_count >= 4 then
    raise exception 'El alumno ya tiene 4 clases activas por semana en esta sede';
  end if;

  return new;
end;
$$;

create trigger trg_validar_limite_clases_semana
  before insert or update on public.inscripciones
  for each row execute function public.fn_validar_limite_clases_semana();

-- Sin superposición horaria entre clases activas del alumno, sin importar la sede
create or replace function public.fn_validar_solapamiento_horario()
returns trigger
language plpgsql
as $$
declare
  v_dia smallint;
  v_inicio time;
  v_fin time;
  v_conflicto boolean;
begin
  if new.estado <> 'activa' then
    return new;
  end if;

  select dia_semana, hora_inicio, hora_fin into v_dia, v_inicio, v_fin
  from public.clases where id = new.clase_id;

  select exists (
    select 1
    from public.inscripciones i
    join public.clases c on c.id = i.clase_id
    where i.alumno_id = new.alumno_id
      and i.estado = 'activa'
      and i.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and c.dia_semana = v_dia
      and c.hora_inicio < v_fin
      and c.hora_fin > v_inicio
  ) into v_conflicto;

  if v_conflicto then
    raise exception 'El horario se superpone con otra clase activa del alumno';
  end if;

  return new;
end;
$$;

create trigger trg_validar_solapamiento_horario
  before insert or update on public.inscripciones
  for each row execute function public.fn_validar_solapamiento_horario();

-- Red de seguridad: nunca puede haber más inscripciones "activa" que el cupo.
-- El flujo normal (paso 5) chequea el cupo ANTES de insertar y decide activa
-- vs. lista_espera; este trigger solo evita que un bug o una carga manual
-- rompa la regla.
create or replace function public.fn_validar_cupo_clase()
returns trigger
language plpgsql
as $$
declare
  v_cupo smallint;
  v_count int;
begin
  if new.estado <> 'activa' then
    return new;
  end if;

  select cupo into v_cupo from public.clases where id = new.clase_id;

  select count(*) into v_count
  from public.inscripciones
  where clase_id = new.clase_id
    and estado = 'activa'
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if v_count >= v_cupo then
    raise exception 'La clase alcanzó su cupo máximo (%), debería anotarse en lista de espera', v_cupo;
  end if;

  return new;
end;
$$;

create trigger trg_validar_cupo_clase
  before insert or update on public.inscripciones
  for each row execute function public.fn_validar_cupo_clase();

-- ============================================================================
-- Vista de ayuda: estado de cuota vigente por alumno + sede
-- ============================================================================
create view public.v_estado_cuota_alumno_sede as
select distinct on (alumno_id, sede_id)
  alumno_id,
  sede_id,
  aprobado_en,
  frecuencia_semanal,
  monto,
  vencimiento,
  case
    when vencimiento < current_date then 'vencida'
    when vencimiento <= current_date + interval '5 days' then 'por_vencer'
    else 'al_dia'
  end as estado_visual
from public.pagos
where estado = 'aprobado'
order by alumno_id, sede_id, aprobado_en desc;

comment on view public.v_estado_cuota_alumno_sede is
  'Última cuota aprobada por alumno+sede. Si un alumno no aparece acá, nunca pagó '
  '(la app debe tratarlo como "vencida"/sin cuota).';

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Se habilita RLS en todo (deny-by-default: nadie salvo service_role puede
-- leer/escribir hasta que se agreguen políticas). Las políticas por rol
-- (admin ve todo, profesor ve sus alumnos, alumno ve lo suyo) se agregan en
-- el paso 3 junto con la autenticación. Por ahora solo se habilita el acceso
-- mínimo de cada usuario a su propio perfil.
alter table public.sedes enable row level security;
alter table public.profiles enable row level security;
alter table public.profesores enable row level security;
alter table public.alumnos enable row level security;
alter table public.aranceles enable row level security;
alter table public.clases enable row level security;
alter table public.inscripciones enable row level security;
alter table public.pagos enable row level security;
alter table public.pagos_auditoria enable row level security;
alter table public.asistencias enable row level security;
alter table public.avisos enable row level security;
alter table public.avisos_sedes enable row level security;

create policy "usuarios pueden ver su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "usuarios pueden actualizar su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);
