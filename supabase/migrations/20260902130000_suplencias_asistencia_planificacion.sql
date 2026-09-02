-- ============================================================================
-- MUV Gimnasia Postural — Suplencias: tomar asistencia + ver planificación (BLOQUE 4, Tarea 3)
--
-- Lo que YA andaba para un suplente activo (fn_es_suplente_de, migración
-- 20260901130000_suplencias.sql): ver el roster/perfiles/fichas/evolución de
-- los alumnos de TODAS las clases del profesor que está cubriendo, y
-- agregar evolución (fn_es_mi_alumno ya incluye el caso de suplencia).
--
-- Lo que faltaba y pide esta tarea:
--   1) Tomar asistencia en esas clases -- las policies de INSERT/UPDATE de
--      `asistencias` solo miraban profesor_id = auth.uid(), nunca la
--      suplencia (a diferencia del SELECT, que sí la contemplaba).
--   2) Ver (nunca modificar) la planificación de esos alumnos/clases -- las
--      funciones de autorización de planificaciones (fn_profesor_autoriza_*)
--      son deliberadamente más angostas que fn_es_mi_alumno y no incluían
--      suplencia (reportado como pendiente en el Bloque 2). Se agregan
--      funciones y policies NUEVAS, exclusivas de SELECT, en vez de tocar las
--      funciones existentes -- así un suplente nunca puede crear/editar/
--      borrar una planificación ni sus días/bloques/ejercicios/semanas, solo
--      lo autoriza a leer. "No alcanza con esconder botones": esto queda
--      reforzado acá, en la base, no solo en la UI.
--
-- El acceso sigue acotado a los alumnos/clases de la suplencia autorizada
-- (los del profesor_original mientras la fila de suplencias esté activa=true
-- y vigente hoy -- fn_es_suplente_de ya lo resuelve así) y desaparece solo
-- en cuanto la suplencia deja de estar vigente, sin ningún paso manual.
-- ============================================================================

-- 1) Asistencias: el profesor suplente puede tomar/actualizar asistencia en
-- las clases del profesor que está cubriendo, igual que ya podía verlas.
drop policy if exists "profesor toma asistencia en sus clases" on public.asistencias;
create policy "profesor toma asistencia en sus clases"
  on public.asistencias for insert
  with check (
    exists (select 1 from public.clases c where c.id = clase_id and c.profesor_id = auth.uid())
    or exists (select 1 from public.clases c where c.id = clase_id and public.fn_es_suplente_de(c.profesor_id))
  );

drop policy if exists "profesor actualiza asistencia en sus clases" on public.asistencias;
create policy "profesor actualiza asistencia en sus clases"
  on public.asistencias for update
  using (
    exists (select 1 from public.clases c where c.id = clase_id and c.profesor_id = auth.uid())
    or exists (select 1 from public.clases c where c.id = clase_id and public.fn_es_suplente_de(c.profesor_id))
  )
  with check (
    exists (select 1 from public.clases c where c.id = clase_id and c.profesor_id = auth.uid())
    or exists (select 1 from public.clases c where c.id = clase_id and public.fn_es_suplente_de(c.profesor_id))
  );

-- 2) Planificaciones: acceso de SOLO LECTURA para el suplente. Funciones
-- nuevas y separadas de fn_profesor_autoriza_alumno_planificacion /
-- fn_profesor_autoriza_clase_planificacion a propósito -- esas dos también
-- las usan las policies de insert/update/delete (vía fn_planificacion_
-- autorizada), y agregarles el caso de suplencia ahí terminaría dándole
-- también permiso de escritura, que es exactamente lo que no debe pasar.
create or replace function public.fn_suplente_autoriza_planificacion_alumno(p_alumno_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn_suplente_autoriza_planificacion_alumno$
  select exists (
    select 1
    from public.inscripciones i
    join public.clases c on c.id = i.clase_id
    where i.alumno_id = p_alumno_id
      and i.estado in ('activa', 'lista_espera')
      and public.fn_es_suplente_de(c.profesor_id)
  );
$fn_suplente_autoriza_planificacion_alumno$;

create or replace function public.fn_suplente_autoriza_planificacion_clase(p_clase_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn_suplente_autoriza_planificacion_clase$
  select exists (
    select 1 from public.clases c
    where c.id = p_clase_id and public.fn_es_suplente_de(c.profesor_id)
  );
$fn_suplente_autoriza_planificacion_clase$;

-- Mismo rol que fn_planificacion_autorizada (resuelve tipo/dueño desde el
-- id de la planificación, para las 4 tablas hijas), pero con el criterio de
-- suplente y SIN el chequeo de "es_actual": un suplente puede consultar
-- también versiones históricas, nunca editar ninguna de todos modos.
create or replace function public.fn_suplente_ve_planificacion(p_planificacion_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $fn_suplente_ve_planificacion$
declare
  v_tipo public.tipo_planificacion;
  v_alumno_id uuid;
  v_clase_id uuid;
begin
  select tipo, alumno_id, clase_id
  into v_tipo, v_alumno_id, v_clase_id
  from public.planificaciones
  where id = p_planificacion_id;

  if v_tipo is null then
    return false;
  end if;

  if v_tipo = 'individual' then
    return public.fn_suplente_autoriza_planificacion_alumno(v_alumno_id) and public.fn_alumno_visible(v_alumno_id);
  else
    return public.fn_suplente_autoriza_planificacion_clase(v_clase_id);
  end if;
end;
$fn_suplente_ve_planificacion$;

create policy "suplente ve planificaciones individuales autorizadas"
  on public.planificaciones for select
  using (
    tipo = 'individual'
    and public.fn_suplente_autoriza_planificacion_alumno(alumno_id)
    and public.fn_alumno_visible(alumno_id)
  );

create policy "suplente ve planificaciones grupales autorizadas"
  on public.planificaciones for select
  using (tipo = 'grupal' and public.fn_suplente_autoriza_planificacion_clase(clase_id));

create policy "suplente ve dias segun planificacion"
  on public.planificacion_dias for select
  using (public.fn_suplente_ve_planificacion(planificacion_id));

create policy "suplente ve bloques segun planificacion"
  on public.planificacion_bloques for select
  using (public.fn_suplente_ve_planificacion(planificacion_id));

create policy "suplente ve ejercicios segun planificacion"
  on public.planificacion_ejercicios for select
  using (public.fn_suplente_ve_planificacion(planificacion_id));

create policy "suplente ve semanas segun planificacion"
  on public.planificacion_ejercicio_semanas for select
  using (public.fn_suplente_ve_planificacion(planificacion_id));
