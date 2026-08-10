-- ============================================================================
-- MUV Gimnasia Postural — Paso 5b: vista de cupo para que el alumno pueda
-- ver si una clase está llena sin poder ver QUIÉN está anotado (por RLS,
-- un alumno solo puede leer sus propias filas de "inscripciones" -- esta
-- vista solo expone un conteo agregado, no filas individuales).
-- ============================================================================

create view public.v_cupo_clases as
select clase_id, count(*) as inscriptos_activos
from public.inscripciones
where estado = 'activa'
group by clase_id;

comment on view public.v_cupo_clases is
  'Conteo de inscriptos activos por clase, sin exponer quiénes son -- para que '
  'cualquier alumno pueda saber si una clase tiene lugar antes de anotarse.';

grant select on public.v_cupo_clases to authenticated;

-- ============================================================================
-- Asigna posicion_espera automáticamente (FIFO). NO puede calcularse en la
-- app: por RLS, un alumno común solo ve sus propias filas de
-- "inscripciones", así que un count() ahí adentro casi siempre daría 0/1 en
-- vez del total real de gente esperando -- tiene que ser security definer
-- para ver el conteo real de todos, igual que fn_es_mi_alumno.
-- ============================================================================
create or replace function public.fn_asignar_posicion_espera()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_siguiente int;
begin
  if new.estado = 'lista_espera' and new.posicion_espera is null then
    select coalesce(max(posicion_espera), 0) + 1 into v_siguiente
    from public.inscripciones
    where clase_id = new.clase_id and estado = 'lista_espera';

    new.posicion_espera := v_siguiente;
  end if;

  return new;
end;
$$;

create trigger trg_asignar_posicion_espera
  before insert on public.inscripciones
  for each row execute function public.fn_asignar_posicion_espera();
