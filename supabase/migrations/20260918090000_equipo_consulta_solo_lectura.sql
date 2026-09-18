-- ============================================================================
-- MUV Gimnasia Postural — "Equipo" pasa a permitir consulta real de otro
-- profesor, SOLO LECTURA (antes solo mostraba horarios -- ver comentario en
-- 20260902090000_planificaciones.sql: "no se amplía el acceso a
-- planificaciones a suplentes todavía... queda pendiente evaluar más
-- adelante" -- esta migración es esa extensión, ahora pedida explícitamente).
--
-- DIFERENCIA A PROPÓSITO con el sistema de "suplencias" ya existente
-- (20260901130000_suplencias.sql + 20260902130000): ese es LECTURA acotada a
-- un rango de fechas concreto que el admin configura ("Sabina cubre a Laila
-- del 10 al 20"). Esto de acá es más amplio y SIEMPRE disponible: cualquier
-- profesor de MUV puede consultar (nunca editar) la información de
-- cualquier alumna real de MUV -- para poder prepararse ANTES de que exista
-- una suplencia formal, como pidió el bloque. Ambos mecanismos conviven: no
-- se toca ni se reemplaza el de suplencias (sigue existiendo para lo suyo).
--
-- Alcance explícitamente EXCLUIDO de esta migración (a propósito, por
-- pedido explícito -- "todo esto debe ser SOLO LECTURA"):
--   - Ninguna policy de INSERT/UPDATE/DELETE se toca ni se agrega acá --
--     todas las políticas de escritura siguen exigiendo dueño real
--     (fn_es_mi_alumno / fn_profesor_autoriza_alumno_planificacion /
--     fn_profesor_autoriza_clase_planificacion, sin cambios).
--   - No se amplía "asistencias" (historial de presente/ausente) -- no
--     estaba pedido ("observaciones relevantes" ya lo cubren evolución/
--     feedback/ficha, sin necesidad de exponer el detalle de asistencia).
--   - No se amplía la vista de cuota/pagos -- el perfil de alumna que ve el
--     profesor nunca mostró esa información, ni para sus propias alumnas.
--   - No se toca la tabla "suplencias" ni fn_es_suplente_de.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Helpers nuevos, ambos SECURITY DEFINER de solo lectura.
-- ----------------------------------------------------------------------------

-- ¿p_alumno_id es una alumna real de MUV (anotada, activa o en lista de
-- espera, en CUALQUIER clase -- no solo las del profesor logueado)?
create or replace function public.fn_alumno_de_muv(p_alumno_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.inscripciones i
    where i.alumno_id = p_alumno_id
      and i.estado in ('activa', 'lista_espera')
  );
$$;

comment on function public.fn_alumno_de_muv(uuid) is
  'Cualquier alumna con una inscripción vigente en alguna clase, sin importar de qué profesor -- usada SOLO en policies de SELECT para "Equipo" (consulta entre profesores), nunca en policies de escritura.';

-- Punto único de autorización de LECTURA para "Equipo": ¿esta fila de
-- planificaciones (y, por extensión, sus tablas hijas + el archivo Excel en
-- Storage) es consultable en modo equipo? Individual -> misma regla de
-- visibilidad que ya protege el resto (alumna real + visible por cuota
-- aprobada). Grupal -> cualquier clase real (ya son 100% públicas para
-- cualquier autenticado vía "autenticados ven clases", así que su
-- planificación grupal no agrega información más sensible que esa).
create or replace function public.fn_planificacion_visible_equipo(p_planificacion_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $fn_planificacion_visible_equipo$
declare
  v_tipo public.tipo_planificacion;
  v_alumno_id uuid;
  v_clase_id uuid;
begin
  if public.fn_current_role() <> 'profesor' then
    return false;
  end if;

  select tipo, alumno_id, clase_id
  into v_tipo, v_alumno_id, v_clase_id
  from public.planificaciones
  where id = p_planificacion_id;

  if v_tipo is null then
    return false;
  end if;

  if v_tipo = 'individual' then
    return public.fn_alumno_de_muv(v_alumno_id) and public.fn_alumno_visible(v_alumno_id);
  else
    return exists (select 1 from public.clases c where c.id = v_clase_id);
  end if;
end;
$fn_planificacion_visible_equipo$;

comment on function public.fn_planificacion_visible_equipo(uuid) is
  'SOLO para policies "for select" de Equipo -- nunca usar en insert/update/delete. No reemplaza a fn_planificacion_autorizada (esa sigue siendo la única autorización de escritura).';

-- ----------------------------------------------------------------------------
-- 1) alumnos / profiles: consulta de cualquier alumna real de MUV.
-- ----------------------------------------------------------------------------
create policy "profesor consulta alumnas de equipo (solo lectura)"
  on public.alumnos for select
  using (
    public.fn_current_role() = 'profesor'
    and public.fn_alumno_de_muv(id)
    and public.fn_alumno_visible(id)
  );

create policy "profesor consulta perfiles de alumnas de equipo (solo lectura)"
  on public.profiles for select
  using (
    role = 'alumno'
    and public.fn_current_role() = 'profesor'
    and exists (
      select 1 from public.alumnos a
      where a.profile_id = profiles.id
        and public.fn_alumno_de_muv(a.id)
        and public.fn_alumno_visible(a.id)
    )
  );

-- ----------------------------------------------------------------------------
-- 2) Ficha de evaluación, evoluciones y pruebas funcionales -- solo lectura.
-- ----------------------------------------------------------------------------
create policy "profesor consulta fichas de equipo (solo lectura)"
  on public.fichas_evaluacion for select
  using (
    public.fn_current_role() = 'profesor'
    and public.fn_alumno_de_muv(alumno_id)
    and public.fn_alumno_visible(alumno_id)
  );

create policy "profesor consulta notas de equipo (solo lectura)"
  on public.ficha_evaluacion_notas for select
  using (
    public.fn_current_role() = 'profesor'
    and public.fn_alumno_de_muv(alumno_id)
    and public.fn_alumno_visible(alumno_id)
  );

create policy "profesor consulta pruebas funcionales de equipo (solo lectura)"
  on public.ficha_evaluacion_pruebas_funcionales for select
  using (
    public.fn_current_role() = 'profesor'
    and public.fn_alumno_de_muv(alumno_id)
    and public.fn_alumno_visible(alumno_id)
  );

-- ----------------------------------------------------------------------------
-- 3) Feedback de clase -- mismo criterio que la policy propia ya existente
--    ("profesor ve feedback de sus clases", por clase), pero para cualquier
--    clase real (todas ya son visibles vía "autenticados ven clases").
-- ----------------------------------------------------------------------------
create policy "profesor consulta feedback de equipo (solo lectura)"
  on public.feedback_clases for select
  using (
    public.fn_current_role() = 'profesor'
    and exists (select 1 from public.clases c where c.id = clase_id)
  );

-- ----------------------------------------------------------------------------
-- 4) Roster de cualquier clase (para "Equipo -> Profesor -> Clase ->
--    Alumnas"). Ya existía el mismo ensanche para suplencia formal
--    (20260901130000) -- esto es la versión SIEMPRE disponible.
-- ----------------------------------------------------------------------------
create policy "profesor consulta inscripciones de equipo (solo lectura)"
  on public.inscripciones for select
  using (public.fn_current_role() = 'profesor');

-- ----------------------------------------------------------------------------
-- 5) Planificaciones (individual + grupal) y sus 4 tablas hijas -- todas
--    delegan a fn_planificacion_visible_equipo, que ya resuelve tipo/dueño.
--    Ninguna policy de insert/update/delete se toca.
-- ----------------------------------------------------------------------------
create policy "profesor consulta planificaciones de equipo (solo lectura)"
  on public.planificaciones for select
  using (public.fn_planificacion_visible_equipo(id));

create policy "equipo consulta dias segun planificacion"
  on public.planificacion_dias for select
  using (public.fn_planificacion_visible_equipo(planificacion_id));

create policy "equipo consulta bloques segun planificacion"
  on public.planificacion_bloques for select
  using (public.fn_planificacion_visible_equipo(planificacion_id));

create policy "equipo consulta ejercicios segun planificacion"
  on public.planificacion_ejercicios for select
  using (public.fn_planificacion_visible_equipo(planificacion_id));

create policy "equipo consulta semanas segun planificacion"
  on public.planificacion_ejercicio_semanas for select
  using (public.fn_planificacion_visible_equipo(planificacion_id));

-- ----------------------------------------------------------------------------
-- 6) Storage: archivos de planificación Excel -- misma función de arriba,
--    reutilizada (nunca una regla nueva y separada). Solo SELECT: la policy
--    de INSERT ("profesor autorizado sube archivo de planificacion") no se
--    toca, sigue exigiendo dueño real -- un profesor de equipo nunca puede
--    subir/reemplazar el archivo de una planificación ajena.
-- ----------------------------------------------------------------------------
create policy "equipo consulta archivos de planificacion (solo lectura)"
  on storage.objects for select
  using (
    bucket_id = 'planificaciones-excel'
    and public.fn_planificacion_visible_equipo(((storage.foldername(name))[1])::uuid)
  );
