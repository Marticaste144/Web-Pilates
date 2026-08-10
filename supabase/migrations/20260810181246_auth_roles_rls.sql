-- ============================================================================
-- MUV Gimnasia Postural — Paso 3: RLS por rol + reglas de negocio pendientes
-- Migración incremental (la 20260810173955 ya se aplicó a mano en el
-- proyecto real vía SQL Editor). Acá NO se recrean tipos/tablas.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Funciones de ayuda (SECURITY DEFINER: leen sin chocar con el RLS que ellas
-- mismas ayudan a evaluar -- evita el clásico error de recursión infinita).
-- ---------------------------------------------------------------------------

-- Rol del usuario logueado actual.
create or replace function public.fn_current_role()
returns public.rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ¿El alumno p_alumno_id está anotado (activa/lista_espera) en alguna clase
-- del profesor logueado?
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
  );
$$;

-- ¿El alumno ya tuvo alguna vez un pago aprobado? (regla de visibilidad:
-- invisible para profesores hasta la primera cuota aprobada).
create or replace function public.fn_alumno_visible(p_alumno_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pagos where alumno_id = p_alumno_id and estado = 'aprobado'
  );
$$;

-- ¿Hay un aviso activo que bloquea esa sede en esa fecha?
create or replace function public.fn_sede_bloqueada(p_sede_id uuid, p_fecha date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.avisos a
    where p_fecha between a.fecha_inicio and a.fecha_fin
      and (
        a.todas_las_sedes
        or exists (
          select 1 from public.avisos_sedes av
          where av.aviso_id = a.id and av.sede_id = p_sede_id
        )
      )
  );
$$;

-- ============================================================================
-- Reglas de negocio que faltaban como triggers (mismo criterio que en el
-- paso 2: invariantes duras a nivel de base, no solo validación de UI)
-- ============================================================================

-- Un aviso activo bloquea anotarse/darse de baja en clases de esa sede, hoy.
-- La admin queda exenta (puede seguir gestionando manualmente).
create or replace function public.fn_validar_aviso_inscripcion()
returns trigger
language plpgsql
as $$
declare
  v_sede_id uuid;
begin
  if public.fn_current_role() = 'admin' then
    return new;
  end if;

  select sede_id into v_sede_id from public.clases where id = new.clase_id;

  if public.fn_sede_bloqueada(v_sede_id, current_date) then
    raise exception 'Hay un aviso activo que bloquea esta sede hoy';
  end if;

  return new;
end;
$$;

create trigger trg_validar_aviso_inscripcion
  before insert or update on public.inscripciones
  for each row execute function public.fn_validar_aviso_inscripcion();

-- Cuota vencida en la sede => no puede anotarse a NUEVAS clases (sí puede
-- seguir en las que ya tenía, y siempre puede darse de baja).
create or replace function public.fn_validar_cuota_para_inscripcion()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_sede_id uuid;
  v_tiene_pago_previo boolean;
  v_vencimiento date;
begin
  if public.fn_current_role() = 'admin' then
    return new;
  end if;

  if new.estado not in ('activa', 'lista_espera') then
    return new;
  end if;

  select sede_id into v_sede_id from public.clases where id = new.clase_id;

  select exists (
    select 1 from public.pagos
    where alumno_id = new.alumno_id and sede_id = v_sede_id and estado = 'aprobado'
  ) into v_tiene_pago_previo;

  -- Primera inscripción en la sede: todavía no le tocó pagar, se deja pasar.
  if not v_tiene_pago_previo then
    return new;
  end if;

  select vencimiento into v_vencimiento
  from public.pagos
  where alumno_id = new.alumno_id and sede_id = v_sede_id and estado = 'aprobado'
  order by aprobado_en desc
  limit 1;

  if v_vencimiento < current_date then
    raise exception 'El alumno tiene la cuota vencida en esta sede; debe regularizar el pago antes de inscribirse';
  end if;

  return new;
end;
$$;

create trigger trg_validar_cuota_para_inscripcion
  before insert on public.inscripciones
  for each row execute function public.fn_validar_cuota_para_inscripcion();

-- Se registra fecha_baja automáticamente al pasar a estado = 'baja'.
create or replace function public.fn_set_fecha_baja()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'baja' and old.estado is distinct from 'baja' and new.fecha_baja is null then
    new.fecha_baja := now();
  end if;
  return new;
end;
$$;

create trigger trg_inscripciones_fecha_baja
  before update on public.inscripciones
  for each row execute function public.fn_set_fecha_baja();

-- Un aviso activo bloquea tomar asistencia de esa sede en la fecha de la
-- sesión (no en "hoy": la sesión puede estar siendo cargada después).
create or replace function public.fn_validar_aviso_asistencia()
returns trigger
language plpgsql
as $$
declare
  v_sede_id uuid;
begin
  if public.fn_current_role() = 'admin' then
    return new;
  end if;

  select sede_id into v_sede_id from public.clases where id = new.clase_id;

  if public.fn_sede_bloqueada(v_sede_id, new.fecha) then
    raise exception 'Hay un aviso activo que bloquea esta sede en esa fecha';
  end if;

  return new;
end;
$$;

create trigger trg_validar_aviso_asistencia
  before insert or update on public.asistencias
  for each row execute function public.fn_validar_aviso_asistencia();

-- Cuota vencida en la sede => no se puede marcar PRESENTE (ausente sí).
create or replace function public.fn_validar_cuota_para_asistencia()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_sede_id uuid;
  v_vencimiento date;
begin
  if new.estado is distinct from 'presente' then
    return new;
  end if;

  select sede_id into v_sede_id from public.clases where id = new.clase_id;

  select vencimiento into v_vencimiento
  from public.pagos
  where alumno_id = new.alumno_id and sede_id = v_sede_id and estado = 'aprobado'
  order by aprobado_en desc
  limit 1;

  if v_vencimiento is null or v_vencimiento < current_date then
    raise exception 'El alumno tiene la cuota vencida en esta sede; no se le puede marcar presente';
  end if;

  return new;
end;
$$;

create trigger trg_validar_cuota_para_asistencia
  before insert or update on public.asistencias
  for each row execute function public.fn_validar_cuota_para_asistencia();

-- Registra quién y cuándo tomó/actualizó una asistencia.
create or replace function public.fn_set_tomado_asistencia()
returns trigger
language plpgsql
as $$
begin
  if new.estado is not null and (tg_op = 'INSERT' or old.estado is distinct from new.estado) then
    new.tomado_por := auth.uid();
    new.tomado_en := now();
  end if;
  return new;
end;
$$;

create trigger trg_asistencias_tomado
  before insert or update on public.asistencias
  for each row execute function public.fn_set_tomado_asistencia();

-- Trazabilidad automática: cualquier cambio de estado de un pago queda
-- registrado en pagos_auditoria, sin depender de que el código que lo llame
-- se acuerde de hacerlo (incluye al webhook de Mercado Pago y a la admin).
create or replace function public.fn_registrar_auditoria_pago()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.estado is distinct from old.estado then
    insert into public.pagos_auditoria (pago_id, estado_anterior, estado_nuevo, realizado_por)
    values (new.id, old.estado, new.estado, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_registrar_auditoria_pago
  after update on public.pagos
  for each row execute function public.fn_registrar_auditoria_pago();

-- No se permite tocar role/email/id de profiles salvo que quien edita sea
-- admin (el profesor puede editar datos del alumno, pero no su rol).
create or replace function public.fn_restringir_columnas_profile()
returns trigger
language plpgsql
as $$
begin
  if public.fn_current_role() = 'admin' then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.email is distinct from old.email
     or new.id is distinct from old.id then
    raise exception 'No tenés permiso para modificar ese campo del perfil';
  end if;

  return new;
end;
$$;

create trigger trg_restringir_columnas_profile
  before update on public.profiles
  for each row execute function public.fn_restringir_columnas_profile();

-- ============================================================================
-- Vista de cuota: se reescribe para filtrar por quién pregunta. La vista
-- corre con los privilegios de su dueña (postgres), así que sin este WHERE
-- cualquiera que la consultara vería el estado de cuota de TODOS los
-- alumnos, RLS de "pagos" o no.
-- ============================================================================
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
  end as estado_visual
from public.pagos
where estado = 'aprobado'
  and (
    public.fn_current_role() = 'admin'
    or alumno_id = auth.uid()
    or public.fn_es_mi_alumno(alumno_id)
  )
order by alumno_id, sede_id, aprobado_en desc;

-- ============================================================================
-- Grants (el gate grueso; RLS de abajo es el gate fino por fila)
-- ============================================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ============================================================================
-- Políticas RLS por rol
-- ============================================================================

-- ---- profiles (ya tiene "propio perfil" select/update del paso 2) --------
create policy "admin ve todos los perfiles"
  on public.profiles for select
  using (public.fn_current_role() = 'admin');

create policy "admin actualiza cualquier perfil"
  on public.profiles for update
  using (public.fn_current_role() = 'admin');

create policy "autenticados ven perfiles de profesores"
  on public.profiles for select
  to authenticated
  using (role = 'profesor');

create policy "profesor ve perfiles de sus alumnos visibles"
  on public.profiles for select
  using (role = 'alumno' and public.fn_es_mi_alumno(id) and public.fn_alumno_visible(id));

create policy "profesor actualiza datos de sus alumnos"
  on public.profiles for update
  using (role = 'alumno' and public.fn_es_mi_alumno(id))
  with check (role = 'alumno' and public.fn_es_mi_alumno(id));

-- ---- sedes -----------------------------------------------------------------
create policy "autenticados ven sedes"
  on public.sedes for select to authenticated using (true);
create policy "admin gestiona sedes"
  on public.sedes for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

-- ---- profesores --------------------------------------------------------------
create policy "autenticados ven profesores"
  on public.profesores for select to authenticated using (true);
create policy "admin gestiona profesores"
  on public.profesores for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

-- ---- alumnos: NO es de lectura libre (undermine la regla de visibilidad) --
create policy "admin ve todos los alumnos"
  on public.alumnos for select
  using (public.fn_current_role() = 'admin');
create policy "alumno ve su propia fila"
  on public.alumnos for select
  using (profile_id = auth.uid());
create policy "profesor ve sus alumnos visibles"
  on public.alumnos for select
  using (public.fn_es_mi_alumno(profile_id) and public.fn_alumno_visible(profile_id));
create policy "admin gestiona alumnos"
  on public.alumnos for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

-- ---- aranceles ---------------------------------------------------------------
create policy "autenticados ven aranceles"
  on public.aranceles for select to authenticated using (true);
create policy "admin gestiona aranceles"
  on public.aranceles for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

-- ---- clases --------------------------------------------------------------
create policy "autenticados ven clases"
  on public.clases for select to authenticated using (true);
create policy "admin gestiona clases"
  on public.clases for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

-- ---- inscripciones ---------------------------------------------------------
create policy "admin gestiona inscripciones"
  on public.inscripciones for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');
create policy "profesor ve inscripciones de sus clases"
  on public.inscripciones for select
  using (exists (select 1 from public.clases c where c.id = clase_id and c.profesor_id = auth.uid()));
create policy "alumno ve sus propias inscripciones"
  on public.inscripciones for select
  using (alumno_id = auth.uid());
create policy "alumno se inscribe"
  on public.inscripciones for insert
  with check (alumno_id = auth.uid());
create policy "alumno se da de baja"
  on public.inscripciones for update
  using (alumno_id = auth.uid())
  with check (alumno_id = auth.uid() and estado = 'baja');

-- ---- pagos: el profesor NO tiene select acá (solo por la vista de arriba) --
create policy "admin gestiona pagos"
  on public.pagos for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');
create policy "alumno ve sus pagos"
  on public.pagos for select
  using (alumno_id = auth.uid());
create policy "alumno crea su intento de pago"
  on public.pagos for insert
  with check (alumno_id = auth.uid() and estado = 'pendiente');

-- ---- pagos_auditoria: solo admin, y solo lectura (la escribe el trigger) --
create policy "admin ve auditoria de pagos"
  on public.pagos_auditoria for select
  using (public.fn_current_role() = 'admin');

-- ---- asistencias -----------------------------------------------------------
create policy "admin gestiona asistencias"
  on public.asistencias for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');
create policy "profesor ve asistencias de sus clases"
  on public.asistencias for select
  using (exists (select 1 from public.clases c where c.id = clase_id and c.profesor_id = auth.uid()));
create policy "alumno ve sus asistencias"
  on public.asistencias for select
  using (alumno_id = auth.uid());
create policy "profesor toma asistencia en sus clases"
  on public.asistencias for insert
  with check (exists (select 1 from public.clases c where c.id = clase_id and c.profesor_id = auth.uid()));
create policy "profesor actualiza asistencia en sus clases"
  on public.asistencias for update
  using (exists (select 1 from public.clases c where c.id = clase_id and c.profesor_id = auth.uid()))
  with check (exists (select 1 from public.clases c where c.id = clase_id and c.profesor_id = auth.uid()));

-- ---- avisos / avisos_sedes ---------------------------------------------------
create policy "autenticados ven avisos"
  on public.avisos for select to authenticated using (true);
create policy "admin gestiona avisos"
  on public.avisos for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

create policy "autenticados ven avisos_sedes"
  on public.avisos_sedes for select to authenticated using (true);
create policy "admin gestiona avisos_sedes"
  on public.avisos_sedes for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');
