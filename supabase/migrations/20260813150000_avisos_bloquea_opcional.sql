-- ============================================================================
-- MUV Gimnasia Postural — Avisos: bloquear la sede pasa a ser opcional
-- Hasta ahora TODO aviso bloqueaba inscripciones/bajas/asistencia de la(s)
-- sede(s) afectada(s) en su rango de fechas. Hace falta poder publicar
-- avisos puramente informativos ("che, el viernes va a hacer calor, traigan
-- agua") sin que bloqueen nada.
-- ============================================================================

alter table public.avisos
  add column bloquea boolean not null default true;

comment on column public.avisos.bloquea is
  'true (default) = bloquea inscripciones/bajas/asistencia de la sede en su rango de fechas -- comportamiento histórico, y el que conservan los avisos ya publicados antes de esta columna. false = puramente informativo, no bloquea nada (el email se manda igual en los dos casos).';

-- fn_sede_bloqueada (paso 3) ahora solo cuenta los avisos con bloquea = true
-- -- un aviso informativo no debe impedir que un alumno se anote/dé de baja
-- ni que un profesor tome asistencia.
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
    where a.bloquea
      and p_fecha between a.fecha_inicio and a.fecha_fin
      and (
        a.todas_las_sedes
        or exists (
          select 1 from public.avisos_sedes av
          where av.aviso_id = a.id and av.sede_id = p_sede_id
        )
      )
  );
$$;
