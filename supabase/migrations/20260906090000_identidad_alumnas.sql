-- ============================================================================
-- MUV Gimnasia Postural — Identidad de alumnas desacoplada de Auth
-- PREPARADA, NO APLICADA (ver auditoría de cierre de bloques funcionales).
--
-- PROBLEMA: "alumnos.profile_id" es hoy la PRIMARY KEY de alumnos y una FK a
-- auth.users (vía profiles) -- una alumna solo puede existir si tiene una
-- cuenta de Supabase Auth. En la realidad, MUV tiene alumnas (sobre todo
-- mayores) que van a clase pero nunca van a usar la web. Necesitamos poder
-- cargarlas igual, con ficha/clases/pagos/asistencias reales, sin inventar
-- un email ni crearles una cuenta que no quieren.
--
-- SOLUCIÓN (clave subrogada, patrón estándar para desacoplar identidad de
-- autenticación): "alumnos" pasa a tener su propio id (uuid) como primary
-- key, independiente de auth.users. "profile_id" pasa a ser NULLABLE + UNIQUE
-- (se completa recién cuando/si esa alumna obtiene acceso). Todas las tablas
-- que hoy apuntan a alumnos(profile_id) pasan a apuntar a alumnos(id).
--
-- POR QUÉ ES SEGURO PARA LOS DATOS EXISTENTES: para toda alumna que YA tiene
-- cuenta hoy, se hace `id := profile_id` (se copia el mismo uuid que ya tenía
-- como PK). Como los valores de alumno_id en inscripciones/pagos/asistencias/
-- etc. son y siguen siendo ese mismo uuid, NINGUNA fila hija necesita
-- reescribirse -- el histórico completo queda intacto, solo cambia CONTRA
-- QUÉ COLUMNA apunta la FK (profile_id -> id), no los valores en sí.
--
-- DE ACÁ EN ADELANTE alumnos.id YA NO ES SIEMPRE auth.uid():
--   - Autoregistro público (signUpAlumno): sigue siendo 1:1 -- se crea con
--     id = profile_id = el auth.uid() nuevo, como hasta ahora.
--   - Alta manual de Admin (crearAlumnaManual): profile_id queda NULL, id es
--     un uuid nuevo propio. No hay auth.users ni profiles todavía.
--   - "Dar acceso a MUV" sobre una alumna manual: generateLink({type:
--     'invite', ..., options:{data:{alumno_id: <id existente>}}}) -- el
--     trigger fn_handle_new_user (más abajo) VINCULA profile_id a la fila
--     YA EXISTENTE en vez de crear una alumna nueva. Nunca se duplica.
--
-- Por esto, cualquier RLS/función que comparaba "alumno_id = auth.uid()"
-- para decir "esta fila es mía" deja de ser válida en general (solo
-- coincide por construcción para quien se autoregistró) -- se reemplaza por
-- fn_alumno_id_actual(), que resuelve el id real de alumnos del usuario
-- logueado. Las funciones que YA trataban alumno_id como un id opaco
-- (fn_es_mi_alumno, fn_alumno_visible, fn_profesor_autoriza_alumno_
-- planificacion, etc.) NO necesitan cambios: siguen comparando contra
-- inscripciones/pagos.alumno_id, que sigue siendo el mismo valor de siempre.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Columna subrogada + backfill (no destructivo: copia el valor existente)
-- ----------------------------------------------------------------------------
alter table public.alumnos add column id uuid;
update public.alumnos set id = profile_id where id is null;
alter table public.alumnos alter column id set not null;
alter table public.alumnos alter column id set default gen_random_uuid();

-- ----------------------------------------------------------------------------
-- 2) Datos propios de la alumna (antes SOLO vivían en profiles -- una alumna
--    sin Auth no tiene profiles, así que necesita su propia copia). Cuando
--    profile_id SÍ está presente, estas columnas quedan en null y profiles
--    sigue siendo la fuente de verdad de siempre -- cero cambios de
--    comportamiento para una alumna que ya tiene cuenta.
-- ----------------------------------------------------------------------------
alter table public.alumnos
  add column nombre text,
  add column apellido text,
  add column email text,
  add column telefono text,
  add column activo boolean not null default true,
  add column creado_por uuid references public.profiles (id);

comment on column public.alumnos.nombre is 'Solo se usa cuando profile_id es null (alumna sin cuenta) -- si tiene cuenta, el nombre real es siempre profiles.nombre.';
comment on column public.alumnos.apellido is 'Ídem nombre.';
comment on column public.alumnos.email is 'Opcional -- una alumna sin cuenta puede no tener email cargado. NUNCA se inventa uno acá ni en la app.';
comment on column public.alumnos.telefono is 'Ídem nombre -- solo relevante cuando profile_id es null.';
comment on column public.alumnos.activo is 'Estado administrativo de la alumna (activa/inactiva) -- independiente de si tiene acceso a MUV o no.';
comment on column public.alumnos.creado_por is 'Admin que la cargó manualmente. Null para autoregistro público (no la creó nadie del staff).';

-- ----------------------------------------------------------------------------
-- 3) Reapuntar las FK hijas de alumnos(profile_id) a alumnos(id) ANTES de
--    tocar la PK vieja (Postgres no deja soltar una PK/unique de la que
--    otras tablas todavía dependen).
-- ----------------------------------------------------------------------------
alter table public.inscripciones drop constraint inscripciones_alumno_id_fkey;
alter table public.pagos drop constraint pagos_alumno_id_fkey;
alter table public.asistencias drop constraint asistencias_alumno_id_fkey;
alter table public.feedback_clases drop constraint feedback_clases_alumno_id_fkey;
alter table public.fichas_evaluacion drop constraint fichas_evaluacion_alumno_id_fkey;
alter table public.ficha_evaluacion_notas drop constraint ficha_evaluacion_notas_alumno_id_fkey;
alter table public.ficha_evaluacion_pruebas_funcionales drop constraint ficha_evaluacion_pruebas_funcionales_alumno_id_fkey;
alter table public.planificaciones drop constraint planificaciones_alumno_id_fkey;

-- ----------------------------------------------------------------------------
-- 4) Reemplazar la PK/FK de alumnos: id pasa a ser la primary key;
--    profile_id pasa a nullable + unique, con "on delete set null" en vez de
--    "on delete cascade" -- si algún día se elimina la cuenta de Auth de una
--    alumna, NO debe perderse su historial (clases/pagos/fichas/etc.):
--    simplemente vuelve a quedar "sin acceso".
-- ----------------------------------------------------------------------------
alter table public.alumnos drop constraint alumnos_pkey;
alter table public.alumnos drop constraint alumnos_profile_id_fkey;

alter table public.alumnos add constraint alumnos_pkey primary key (id);
alter table public.alumnos alter column profile_id drop not null;
alter table public.alumnos
  add constraint alumnos_profile_id_fkey foreign key (profile_id) references public.profiles (id) on delete set null;
alter table public.alumnos add constraint uq_alumnos_profile_id unique (profile_id);

-- Una alumna sin cuenta necesita como mínimo un nombre real cargado a mano
-- (nunca puede quedar sin identidad); una alumna con cuenta puede dejar
-- estas columnas en null porque profiles ya la identifica.
alter table public.alumnos add constraint chk_alumnos_identidad check (
  profile_id is not null or (nombre is not null and apellido is not null)
);

-- ----------------------------------------------------------------------------
-- 5) Volver a crear las FK hijas, ahora apuntando a alumnos(id). Mismo
--    on delete que tenían antes en cada tabla -- nada de esto cambia el
--    comportamiento de borrado que ya existía, solo la columna referenciada.
-- ----------------------------------------------------------------------------
alter table public.inscripciones
  add constraint inscripciones_alumno_id_fkey foreign key (alumno_id) references public.alumnos (id) on delete cascade;
alter table public.pagos
  add constraint pagos_alumno_id_fkey foreign key (alumno_id) references public.alumnos (id) on delete cascade;
alter table public.asistencias
  add constraint asistencias_alumno_id_fkey foreign key (alumno_id) references public.alumnos (id) on delete cascade;
alter table public.feedback_clases
  add constraint feedback_clases_alumno_id_fkey foreign key (alumno_id) references public.alumnos (id) on delete cascade;
alter table public.fichas_evaluacion
  add constraint fichas_evaluacion_alumno_id_fkey foreign key (alumno_id) references public.alumnos (id) on delete cascade;
alter table public.ficha_evaluacion_notas
  add constraint ficha_evaluacion_notas_alumno_id_fkey foreign key (alumno_id) references public.alumnos (id) on delete cascade;
alter table public.ficha_evaluacion_pruebas_funcionales
  add constraint ficha_evaluacion_pruebas_funcionales_alumno_id_fkey foreign key (alumno_id) references public.alumnos (id) on delete cascade;
alter table public.planificaciones
  add constraint planificaciones_alumno_id_fkey foreign key (alumno_id) references public.alumnos (id) on delete cascade;

-- ----------------------------------------------------------------------------
-- 6) fn_alumno_id_actual(): resuelve el id REAL de alumnos del usuario
--    logueado -- reemplaza a "auth.uid()" en cualquier RLS/insert que
--    signifique "mi propia fila de alumno". Null si el usuario logueado no
--    es una alumna (o no tiene fila en alumnos todavía, lo cual no debería
--    pasar para nadie con role='alumno' salvo un dato corrupto).
-- ----------------------------------------------------------------------------
create or replace function public.fn_alumno_id_actual()
returns uuid
language sql
stable
security definer
set search_path = public
as $fn_alumno_id_actual$
  select id from public.alumnos where profile_id = auth.uid();
$fn_alumno_id_actual$;

comment on function public.fn_alumno_id_actual() is
  'Id real de "alumnos" del usuario logueado (NO auth.uid() -- desde que una alumna puede empezar sin cuenta y vincularse después, ya no son siempre el mismo valor). Usar esto en vez de auth.uid() en cualquier policy/insert que signifique "mi propia fila de alumno".';

-- ----------------------------------------------------------------------------
-- 7) fn_handle_new_user(): el branch de alumno ahora soporta DOS caminos.
--    - Sin "alumno_id" en los metadatos -> autoregistro público de siempre
--      (signUpAlumno): se crea una fila nueva, id = profile_id = new.id.
--    - Con "alumno_id" en los metadatos -> "Dar acceso a MUV" sobre una
--      alumna YA EXISTENTE (creada manualmente por la admin, sin cuenta
--      todavía): se VINCULA profile_id a esa fila, nunca se crea otra. Si el
--      id no existe o ya tiene acceso, la transacción entera del alta de
--      auth.users se aborta (raise exception) -- así nunca queda un usuario
--      de Auth huérfano sin alumna asociada.
-- ----------------------------------------------------------------------------
create or replace function public.fn_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $fn_handle_new_user$
declare
  v_role public.rol_usuario;
  v_alumno_id uuid;
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
    v_alumno_id := nullif(new.raw_user_meta_data ->> 'alumno_id', '')::uuid;

    if v_alumno_id is not null then
      update public.alumnos
      set profile_id = new.id
      where id = v_alumno_id and profile_id is null;

      if not found then
        raise exception 'No se pudo vincular la invitación a la alumna existente (id inválido o ya tiene acceso vinculado)';
      end if;
    else
      insert into public.alumnos (id, profile_id) values (new.id, new.id);
    end if;
  elsif v_role = 'profesor' then
    insert into public.profesores (profile_id) values (new.id);
  end if;

  return new;
end;
$fn_handle_new_user$;

-- ----------------------------------------------------------------------------
-- 8) RLS: reemplazar "alumno_id = auth.uid()" por fn_alumno_id_actual() en
--    todas las policies de autoservicio (nunca se tocan las de
--    admin/profesor -- esas ya comparaban alumno_id como id opaco, siguen
--    correctas tal cual).
-- ----------------------------------------------------------------------------

-- ---- inscripciones ----------------------------------------------------------
drop policy if exists "alumno ve sus propias inscripciones" on public.inscripciones;
create policy "alumno ve sus propias inscripciones"
  on public.inscripciones for select
  using (alumno_id = public.fn_alumno_id_actual());

drop policy if exists "alumno se inscribe" on public.inscripciones;
create policy "alumno se inscribe"
  on public.inscripciones for insert
  with check (alumno_id = public.fn_alumno_id_actual());

drop policy if exists "alumno se da de baja" on public.inscripciones;
create policy "alumno se da de baja"
  on public.inscripciones for update
  using (alumno_id = public.fn_alumno_id_actual())
  with check (alumno_id = public.fn_alumno_id_actual() and estado = 'baja');

-- ---- pagos -------------------------------------------------------------------
drop policy if exists "alumno ve sus pagos" on public.pagos;
create policy "alumno ve sus pagos"
  on public.pagos for select
  using (alumno_id = public.fn_alumno_id_actual());

drop policy if exists "alumno crea su intento de pago" on public.pagos;
create policy "alumno crea su intento de pago"
  on public.pagos for insert
  with check (alumno_id = public.fn_alumno_id_actual() and estado = 'pendiente');

-- ---- asistencias ---------------------------------------------------------
drop policy if exists "alumno ve sus asistencias" on public.asistencias;
create policy "alumno ve sus asistencias"
  on public.asistencias for select
  using (alumno_id = public.fn_alumno_id_actual());

drop policy if exists "alumno confirma su propia asistencia" on public.asistencias;
create policy "alumno confirma su propia asistencia"
  on public.asistencias for insert
  with check (
    alumno_id = public.fn_alumno_id_actual()
    and confirmado = true
    and estado is null
    and agregado_manualmente = false
    and no_registrado = false
    and exists (
      select 1 from public.inscripciones i
      where i.alumno_id = public.fn_alumno_id_actual() and i.clase_id = clase_id and i.estado = 'activa'
    )
  );

drop policy if exists "alumno actualiza su confirmacion" on public.asistencias;
create policy "alumno actualiza su confirmacion"
  on public.asistencias for update
  using (alumno_id = public.fn_alumno_id_actual() and estado is null)
  with check (alumno_id = public.fn_alumno_id_actual() and estado is null);

-- ---- feedback_clases -------------------------------------------------------
drop policy if exists "alumno deja feedback de sus propias clases" on public.feedback_clases;
create policy "alumno deja feedback de sus propias clases"
  on public.feedback_clases for insert
  with check (
    alumno_id = public.fn_alumno_id_actual()
    and exists (
      select 1 from public.inscripciones i
      where i.alumno_id = public.fn_alumno_id_actual() and i.clase_id = clase_id and i.estado = 'activa'
    )
  );

drop policy if exists "alumno ve su propio feedback" on public.feedback_clases;
create policy "alumno ve su propio feedback"
  on public.feedback_clases for select
  using (alumno_id = public.fn_alumno_id_actual());

-- ---- alumnos: "profesor ve sus alumnos visibles" comparaba fn_es_mi_alumno
-- contra profile_id -- eso funcionaba antes SOLO porque profile_id y el id
-- de alumnos eran siempre el mismo valor. Para una alumna SIN cuenta,
-- profile_id es null, así que esa policy nunca la dejaría ver -- justo la
-- alumna que más necesita seguir viéndose (sección 8: "para el profesor no
-- debería importar si la alumna usa la web"). Se corrige para comparar
-- contra alumnos.id, que es lo que fn_es_mi_alumno/fn_alumno_visible
-- siempre esperaron (inscripciones.alumno_id, pagos.alumno_id).
drop policy if exists "profesor ve sus alumnos visibles" on public.alumnos;
create policy "profesor ve sus alumnos visibles"
  on public.alumnos for select
  using (public.fn_es_mi_alumno(id) and public.fn_alumno_visible(id));

-- ---- alumnos: profesor puede editar nombre/apellido/telefono de SUS
-- alumnas SIN cuenta (mismo caso de uso que ya tenía sobre profiles para
-- alumnas con cuenta -- "profesor actualiza datos de sus alumnos"). Se
-- restringen las columnas tocables con un trigger, igual que
-- fn_restringir_columnas_profile ya hace sobre profiles.
create policy "profesor actualiza datos de alumnas sin cuenta"
  on public.alumnos for update
  using (profile_id is null and public.fn_es_mi_alumno(id))
  with check (profile_id is null and public.fn_es_mi_alumno(id));

create or replace function public.fn_restringir_columnas_alumno()
returns trigger
language plpgsql
as $fn_restringir_columnas_alumno$
begin
  if public.fn_current_role() = 'admin' then
    return new;
  end if;

  if new.activo is distinct from old.activo
     or new.email is distinct from old.email
     or new.profile_id is distinct from old.profile_id
     or new.id is distinct from old.id then
    raise exception 'No tenés permiso para modificar ese campo de la alumna';
  end if;

  return new;
end;
$fn_restringir_columnas_alumno$;

create trigger trg_restringir_columnas_alumno
  before update on public.alumnos
  for each row execute function public.fn_restringir_columnas_alumno();

-- ----------------------------------------------------------------------------
-- 8-bis) profiles: "profesor ve/actualiza perfiles de sus alumnos visibles"
--        comparaban fn_es_mi_alumno(profiles.id) -- eso funcionaba porque
--        profiles.id y el id de alumnos eran siempre el mismo valor. Para
--        una alumna que se creó SIN cuenta y después se vinculó ("Dar
--        acceso a MUV"), alumnos.id (con el que están las inscripciones
--        reales) y profiles.id (su auth.uid() nuevo) ya NO son el mismo
--        valor -- sin este fix, el profesor dejaría de poder ver/editar el
--        nombre/teléfono de esa alumna justo el día que consigue acceso.
--        Se resuelve el puente correcto: profiles.id -> alumnos.profile_id
--        -> alumnos.id (el id que fn_es_mi_alumno/fn_alumno_visible esperan).
-- ----------------------------------------------------------------------------
drop policy if exists "profesor ve perfiles de sus alumnos visibles" on public.profiles;
create policy "profesor ve perfiles de sus alumnos visibles"
  on public.profiles for select
  using (
    role = 'alumno'
    and exists (
      select 1 from public.alumnos a
      where a.profile_id = profiles.id and public.fn_es_mi_alumno(a.id) and public.fn_alumno_visible(a.id)
    )
  );

drop policy if exists "profesor actualiza datos de sus alumnos" on public.profiles;
create policy "profesor actualiza datos de sus alumnos"
  on public.profiles for update
  using (
    role = 'alumno'
    and exists (select 1 from public.alumnos a where a.profile_id = profiles.id and public.fn_es_mi_alumno(a.id))
  )
  with check (
    role = 'alumno'
    and exists (select 1 from public.alumnos a where a.profile_id = profiles.id and public.fn_es_mi_alumno(a.id))
  );

-- ----------------------------------------------------------------------------
-- 9) Vista de cuota: mismo reemplazo de auth.uid() -> fn_alumno_id_actual().
--    Se recrea desde la versión más reciente (20260813160000, que agrega
--    "medio").
-- ----------------------------------------------------------------------------
create or replace view public.v_estado_cuota_alumno_sede as
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
  end as estado_visual,
  medio
from public.pagos
where estado = 'aprobado'
  and (
    public.fn_current_role() = 'admin'
    or alumno_id = public.fn_alumno_id_actual()
    or public.fn_es_mi_alumno(alumno_id)
  )
order by alumno_id, sede_id, aprobado_en desc;

-- ----------------------------------------------------------------------------
-- 10) fn_buscar_alumnas_pilates: ya no puede asumir que toda alumna tiene
--     profiles -- pasa a partir de "alumnos" con left join a profiles
--     (coalesce: nombre real si tiene cuenta, el cargado a mano si no).
-- ----------------------------------------------------------------------------
create or replace function public.fn_buscar_alumnas_pilates(p_query text)
returns table (alumno_id uuid, nombre text, apellido text)
language sql
stable
security definer
set search_path = public
as $fn_buscar_alumnas_pilates$
  select distinct al.id, coalesce(pr.nombre, al.nombre, '') as nombre, coalesce(pr.apellido, al.apellido, '') as apellido
  from public.alumnos al
  left join public.profiles pr on pr.id = al.profile_id
  join public.inscripciones i on i.alumno_id = al.id and i.estado = 'activa'
  join public.clases c on c.id = i.clase_id
  join public.actividades act on act.id = c.actividad_id and act.nombre = 'Pilates'
  where public.fn_current_role() in ('profesor', 'admin')
    and public.fn_alumno_visible(al.id)
    and (coalesce(pr.nombre, al.nombre, '') || ' ' || coalesce(pr.apellido, al.apellido, '')) ilike '%' || p_query || '%'
  order by apellido, nombre
  limit 20;
$fn_buscar_alumnas_pilates$;

-- ============================================================================
-- NOTA: esta migración NO toca fn_es_mi_alumno, fn_alumno_visible,
-- fn_profesor_autoriza_alumno_planificacion, fn_profesor_autoriza_clase_
-- planificacion ni fn_planificacion_autorizada -- todas ya tratan alumno_id
-- como un id opaco (lo comparan contra inscripciones.alumno_id/pagos.
-- alumno_id, nunca contra auth.uid()), así que siguen funcionando sin
-- ningún cambio con la nueva identidad desacoplada.
-- ============================================================================
