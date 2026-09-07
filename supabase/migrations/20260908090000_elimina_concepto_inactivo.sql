-- ============================================================================
-- MUV Gimnasia Postural — Elimina por completo el concepto "inactivo"
--
-- Migración ADICIONAL, independiente de 20260907090000_limpieza_datos_demo.sql
-- (esa ya está aplicada en Supabase y en GitHub -- no se toca, no se
-- reemplaza, queda intacta en el historial). Esta migración no depende de
-- que esa haya corrido ni la contradice: el UPDATE de esa migración marcó
-- activo=false en la fila huérfana de "alumnos" (bloque 2 de acá abajo);
-- acá se DELETEa esa misma fila por su id exacto -- funciona igual esté en
-- true o en false, porque el concepto "activo" en sí deja de existir.
--
-- Decisión de negocio: alumnos, profesores y clases ya NO tienen un estado
-- "activo/inactivo" -- si algo deja de existir, se ELIMINA (con confirmación,
-- desde la app). Esta migración:
--   0) Corrige las funciones que todavía validan/filtran por esas columnas,
--      para que sigan andando una vez que las columnas ya no existan.
--   1) Borra el rastro de datos demo/viejo que hasta ahora solo estaba
--      "desactivado" (nunca borrado) -- verificado fila por fila antes de
--      escribir esto, ver detalle abajo.
--   2) Borra una fila huérfana sin ninguna relación real (la misma que
--      20260907090000 ya había marcado activo=false, sin borrarla).
--   3) Saca las columnas profesores.activo, alumnos.activo y clases.activa.
--
-- Lo que esta migración NO hace (a propósito):
--   - No toca auth.users -- los profesores demo (Bruno Álvarez, Carla
--     Medina) se borran de Auth aparte, con la Admin API (ver
--     scripts/eliminar-profesores-demo.mjs, NO incluido en esta migración a
--     propósito: borrar usuarios de Auth por SQL directo salta el bookeeping
--     interno de Supabase Auth). Ese script debe correr DESPUÉS de aplicar
--     esta migración (el DELETE del bloque 1 ya deja a Bruno/Carla sin
--     ninguna clase asignada, que es lo único que bloquearía el cascade de
--     borrar su fila de "profesores" al borrar su usuario de Auth).
--   - No toca a ningún profesor/alumna/clase real ni sus horarios vigentes.
--   - No inventa reglas nuevas de negocio.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0a) fn_validar_solapamiento_clase(): ya no existe "activa=false libera el
-- horario" -- toda clase que exista ocupa su horario, siempre. Se saca el
-- chequeo de "new.activa is distinct from true" (nunca más aplica) y el
-- "and c.activa" del WHERE de conflicto (todas las filas cuentan ahora).
-- ----------------------------------------------------------------------------
create or replace function public.fn_validar_solapamiento_clase()
returns trigger
language plpgsql
as $$
declare
  v_conflicto boolean;
begin
  select exists (
    select 1
    from public.clases c
    where c.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and c.dia_semana = new.dia_semana
      and c.hora_inicio < new.hora_fin
      and c.hora_fin > new.hora_inicio
      and (
        (new.profesor_id is not null and c.profesor_id = new.profesor_id)
        or (
          new.profesor_id is null
          and new.profesor_pendiente_nombre is not null
          and c.profesor_pendiente_nombre = new.profesor_pendiente_nombre
        )
      )
  ) into v_conflicto;

  if v_conflicto then
    raise exception 'Este profesor ya tiene otra clase que se superpone con este día y horario -- elegí otro horario o eliminá la existente primero';
  end if;

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 0b) fn_restringir_columnas_alumno(): saca el chequeo de "activo" (columna
-- que se elimina en el bloque 3) -- el resto de las protecciones (email,
-- profile_id, id) quedan exactamente igual.
-- ----------------------------------------------------------------------------
create or replace function public.fn_restringir_columnas_alumno()
returns trigger
language plpgsql
as $fn_restringir_columnas_alumno$
begin
  if auth.uid() is null or public.fn_current_role() = 'admin' then
    return new;
  end if;

  if new.email is distinct from old.email
     or new.profile_id is distinct from old.profile_id
     or new.id is distinct from old.id then
    raise exception 'No tenés permiso para modificar ese campo de la alumna';
  end if;

  return new;
end;
$fn_restringir_columnas_alumno$;

-- ----------------------------------------------------------------------------
-- 0c) Vistas públicas de la landing ("Nuestro equipo"): ya no filtran por
-- "activo"/"activa" -- ahora todo profesor/clase que existe es, por
-- definición, real y vigente.
-- ----------------------------------------------------------------------------
create or replace view public.v_profesores_publicos as
select
  p.id,
  p.nombre,
  p.apellido,
  pr.foto_url,
  s.nombre as sede_nombre,
  act.nombre as actividad_nombre
from public.profiles p
join public.profesores pr on pr.profile_id = p.id
left join public.clases c on c.profesor_id = p.id
left join public.sedes s on s.id = c.sede_id
left join public.actividades act on act.id = c.actividad_id
where p.role = 'profesor'
order by p.apellido, p.nombre;

comment on view public.v_profesores_publicos is
  'Profesores con cuenta -- nombre/apellido/foto + sede/actividad reales de sus clases (una fila por clase distinta; lib/landing/profesores-data.ts agrupa por profesor). Corre con privilegios de postgres (bypassa RLS).';

create or replace view public.v_profesores_pendientes_publicos as
select
  c.profesor_pendiente_nombre as nombre,
  s.nombre as sede_nombre,
  act.nombre as actividad_nombre
from public.clases c
join public.sedes s on s.id = c.sede_id
left join public.actividades act on act.id = c.actividad_id
where c.profesor_pendiente_nombre is not null;

comment on view public.v_profesores_pendientes_publicos is
  'Nombres de profesores reales sin cuenta de acceso todavía, + sede/actividad reales de sus clases (una fila por clase distinta) -- ver lib/landing/profesores-data.ts. Se deja de listar acá solo, automáticamente, en cuanto ese nombre se vincule a una cuenta real.';

-- ----------------------------------------------------------------------------
-- 1) Borra el rastro demo/viejo que hasta ahora solo estaba desactivado.
--
-- Verificado fila por fila antes de escribir esto (consulta de solo lectura
-- en producción, 2026-09-07):
--   - 33 clases con activa=false en total. Se auditó cada una contra
--     inscripciones/asistencias/feedback_clases/planificaciones/
--     turnos_liberados: 32 no tienen NINGUNA relación (7 de Bruno Álvarez y
--     Carla Medina -- profesores demo confirmados --, el resto horario
--     viejo de Sabina Bocca y Laila Casin ya reemplazado por su grilla real
--     de septiembre, migración 20260903110000).
--   - La única excepción (id 'dcd098c6-8c92-406a-ac08-d9160e488193', lunes
--     16-17 Postural, horario viejo de Sabina) tenía 1 asistencia manual
--     real ("Pilar Giannelli", 31/08, agregada a mano por un profesor,
--     no_registrado=true, sin alumno_id) -- confirmado explícitamente con
--     la administración que se borra igual junto con la clase (no es una
--     alumna con cuenta ni inscripción, es una nota puntual de esa fecha).
--   - El DELETE es por activa=false completo a propósito: ninguna clase
--     vigente de un profesor real queda con activa=false hoy (confirmado en
--     la misma auditoría), así que este filtro no toca ningún horario
--     actual.
-- ----------------------------------------------------------------------------
delete from public.clases where activa = false;

-- ----------------------------------------------------------------------------
-- 2) Fila huérfana en "alumnos": la cuenta de administración/desarrollo
-- (role='admin' en profiles) tiene además una fila propia en "alumnos",
-- resto de una prueba del flujo de autoregistro con la misma cuenta.
-- Verificado sin ninguna relación (0 inscripciones/pagos/asistencias/
-- feedback/fichas/planificaciones) -- no se toca profiles ni auth.users,
-- solo esta fila puntual de "alumnos". Es la misma fila que
-- 20260907090000_limpieza_datos_demo.sql ya había marcado activo=false (sin
-- borrarla, porque en ese momento el concepto "activo" todavía existía) --
-- este DELETE por id exacto es compatible con eso, la borra sin importar en
-- qué valor haya quedado esa columna.
-- ----------------------------------------------------------------------------
delete from public.alumnos where id = 'ae11c481-4ccd-489c-a238-db504020ae41';

-- ----------------------------------------------------------------------------
-- 3) Se sacan las columnas -- ya no hay ningún lugar del código ni de la
-- base que las use.
-- ----------------------------------------------------------------------------
alter table public.profesores drop column activo;
alter table public.alumnos drop column activo;
alter table public.clases drop column activa;
