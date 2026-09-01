-- ============================================================================
-- MUV Gimnasia Postural — Elimina el sistema general de recuperación de turnos
--
-- La administración confirmó que NO quiere que las alumnas tengan un sistema
-- general de auto-gestión de recuperaciones (liberar/tomar turnos, límite
-- mensual, configuración desde admin). Se da de baja toda esa estructura,
-- creada en 20260901120000_recuperacion_turnos.sql:
--   - tabla turnos_liberados (liberar/tomar turno)
--   - tabla configuracion_recuperaciones (máximo mensual configurable)
--   - funciones fn_validar_liberacion_turno, fn_validar_reclamo_turno_liberado,
--     fn_alumno_en_sede_de_clase (solo usadas por lo anterior)
--   - la policy de asistencias que dependía de turnos_liberados
--
-- Lo que NO se toca (a propósito):
--   - asistencias.es_recuperacion: tag genérico booleano, no es parte del
--     motor automático que se está apagando -- queda preparado para un futuro
--     mecanismo de recuperación puntual (ej. el caso de Pilates que se está
--     relevando), sin ninguna regla especial cableada para nadie.
--   - agregado_manualmente / no_registrado (asistencias) y toda la carga
--     manual de alumnas por parte del profesor: eso es un flujo aparte, no
--     depende de turnos_liberados y sigue funcionando igual.
--   - la confirmación normal de asistencia (confirmado, ventana de 1hs) y la
--     policy "alumno confirma su propia asistencia" (esa exige estar
--     inscripta en la clase, nunca dependió de turnos_liberados).
--   - fn_es_suplente_de / suplencias: no relacionado, sigue igual.
--   - historial de pagos_auditoria y cualquier dato de asistencias ya cargado
--     (nada de esto borra filas de asistencias, inscripciones ni pagos).
--
-- Orden importante: primero se redefine fn_es_mi_alumno para que deje de
-- referenciar turnos_liberados (si se borrara la tabla antes, Postgres
-- tumbaría en cascada esta función -- que usan también profiles/alumnos/
-- fichas_evaluacion -- porque depende de ella). Recién después se puede
-- borrar la tabla sin arrastrar nada que siga haciendo falta.
-- ============================================================================

-- 1) fn_es_mi_alumno vuelve a su versión sin el caso de recuperación (se
-- mantienen los otros dos casos: inscripción directa y suplencia activa).
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
  );
$fn_es_mi_alumno$;

-- 2) La policy de asistencias que dependía de turnos_liberados ya no tiene
-- sentido (nadie puede volver a "tomar" un turno) -- se borra antes de la
-- tabla para que quede explícito en el historial de migraciones, aunque un
-- DROP TABLE ... CASCADE también se la habría llevado puesta.
drop policy if exists "alumno confirma asistencia de recuperacion tomada" on public.asistencias;

-- 3) Funciones de validación exclusivas del motor de recuperación.
drop function if exists public.fn_validar_liberacion_turno() cascade;
drop function if exists public.fn_validar_reclamo_turno_liberado() cascade;
drop function if exists public.fn_alumno_en_sede_de_clase(uuid) cascade;

-- 4) Tablas del motor de recuperación (cascade se lleva sus propios índices,
-- triggers y policies restantes).
drop table if exists public.turnos_liberados cascade;
drop table if exists public.configuracion_recuperaciones cascade;
