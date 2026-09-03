-- ============================================================================
-- MUV Gimnasia Postural — Recuperaciones de Pilates (carga manual del profesor)
--
-- Reemplaza al motor general de recuperación de turnos que se dio de baja en
-- 20260901140000 (autogestión alumno-a-alumno, límite mensual fijo global) por
-- el modelo real confirmado: SOLO Pilates, coordinado por WhatsApp entre
-- alumna y profesor, cargado por el profesor desde la clase. Se reutiliza
-- asistencias.es_recuperacion (ya existía, sin uso -- ver comentario de esa
-- columna en 20260831120000) en vez de crear una tabla nueva: una
-- recuperación ES una fila de asistencia más, en la clase de destino, con
-- es_recuperacion=true.
--
-- 1) asistencias.recupera_ausencia_id: A QUÉ ausencia real de Pilates
--    corresponde esta recuperación (id de la fila de asistencia de la clase
--    que faltó). Enlazar 1 a 1 (no solo contar) es lo que permite, sin una
--    tabla/contador aparte:
--      - nunca recuperar la misma ausencia dos veces (unique index abajo);
--      - calcular "ausencias sin recuperar todavía" con una simple resta de
--        conjuntos (ausentes de Pilates del mes MENOS ya enlazadas), en vez
--        de mantener un contador separado que se puede desincronizar.
--    El mes calendario de la recuperación se obtiene de asistencias.fecha
--    (ya existe) -- no hace falta agregar una columna "periodo_mes" nueva.
--
-- 2) fn_es_mi_alumno se extiende con el caso "vino a recuperar a mi clase"
--    (misma idea que el motor viejo tenía para turnos_liberados, ahora
--    apuntando a asistencias.es_recuperacion) -- sin esto, el profesor vería
--    la fila de asistencia pero RLS le bloquearía el nombre/perfil/cuota de
--    la alumna que recupera.
--
-- 3) fn_buscar_alumnas_pilates: el profesor busca por nombre/apellido para
--    agregar una recuperación -- no tiene (ni debe tener) acceso general a
--    todo el padrón de alumnas, así que la búsqueda se resuelve en una
--    función security definer acotada a quienes tienen Pilates activo Y ya
--    tuvieron alguna cuota aprobada (misma regla de visibilidad de
--    fn_alumno_visible que usa toda la app).
--
-- Toda la validación de fondo (existe la ausencia, no se pasó del máximo
-- mensual según su frecuencia semanal de Pilates, hay cupo) se hace en la
-- app (lib/profesor/recuperaciones-*.ts) contra estas mismas fuentes de
-- verdad -- acá solo se garantiza en la base lo que NO puede quedar librado
-- a que el código de arriba no tenga bugs: una ausencia no se recupera dos
-- veces, y jamás sin ligarla a una ausencia real concreta.
-- ============================================================================

alter table public.asistencias
  add column recupera_ausencia_id uuid references public.asistencias (id) on delete set null;

comment on column public.asistencias.recupera_ausencia_id is
  'Para filas de recuperación (es_recuperacion=true): id de la fila de asistencia de la clase de Pilates que la alumna faltó y está reponiendo acá. Enlace 1 a 1 -- una ausencia no puede recuperarse dos veces (ver uq_asistencias_recupera_ausencia).';

alter table public.asistencias
  add constraint chk_asistencias_recuperacion check (
    (es_recuperacion = false and recupera_ausencia_id is null)
    or (es_recuperacion = true and recupera_ausencia_id is not null)
  );

create unique index uq_asistencias_recupera_ausencia
  on public.asistencias (recupera_ausencia_id)
  where recupera_ausencia_id is not null;

-- ---------------------------------------------------------------------------
-- fn_es_mi_alumno: se agrega el caso "tiene una recuperación cargada en una
-- clase mía" a los dos que ya había (inscripción directa, suplencia activa).
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
    from public.inscripciones i
    join public.clases c on c.id = i.clase_id
    where i.alumno_id = p_alumno_id
      and i.estado in ('activa', 'lista_espera')
      and public.fn_es_suplente_de(c.profesor_id)
  )
  or exists (
    select 1
    from public.asistencias a
    join public.clases c on c.id = a.clase_id
    where a.alumno_id = p_alumno_id
      and a.es_recuperacion = true
      and c.profesor_id = auth.uid()
  );
$fn_es_mi_alumno$;

-- ---------------------------------------------------------------------------
-- Búsqueda de alumnas para agregar una recuperación: solo profesor/admin,
-- solo alumnas con Pilates activo Y visibles (ya tuvieron alguna cuota
-- aprobada -- misma regla que el resto de la app). La validación real de
-- "puede recuperar" (ausencia disponible, máximo mensual, cupo) se hace
-- aparte, al momento de agregarla -- esto es solo para encontrarla por
-- nombre/apellido.
-- ---------------------------------------------------------------------------
create or replace function public.fn_buscar_alumnas_pilates(p_query text)
returns table (alumno_id uuid, nombre text, apellido text)
language sql
stable
security definer
set search_path = public
as $fn_buscar_alumnas_pilates$
  select distinct p.id, p.nombre, p.apellido
  from public.profiles p
  join public.inscripciones i on i.alumno_id = p.id and i.estado = 'activa'
  join public.clases c on c.id = i.clase_id
  join public.actividades act on act.id = c.actividad_id and act.nombre = 'Pilates'
  where public.fn_current_role() in ('profesor', 'admin')
    and public.fn_alumno_visible(p.id)
    and (p.nombre || ' ' || p.apellido) ilike '%' || p_query || '%'
  order by p.apellido, p.nombre
  limit 20;
$fn_buscar_alumnas_pilates$;

grant execute on function public.fn_buscar_alumnas_pilates(text) to authenticated;
