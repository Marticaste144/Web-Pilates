-- ============================================================================
-- MUV Gimnasia Postural — Evita clases superpuestas en la misma sede
-- Hasta ahora se podía crear más de una clase en la misma sede, mismo día y
-- horario solapado (con el mismo profesor o con otro) -- ese espacio físico
-- ya está ocupado. Mismo criterio que fn_validar_solapamiento_horario (paso
-- 3, evita que UN alumno se anote a dos clases que se pisan): invariante
-- dura a nivel de base, no solo validación de UI, para que tampoco se pueda
-- colar por SQL Editor o un bug de la app.
-- ============================================================================

create or replace function public.fn_validar_solapamiento_clase()
returns trigger
language plpgsql
as $$
declare
  v_conflicto boolean;
begin
  -- Desactivar una clase (activa=false) libera el horario, no lo ocupa --
  -- no tiene sentido bloquear esa operación contra sí misma.
  if new.activa is distinct from true then
    return new;
  end if;

  select exists (
    select 1
    from public.clases c
    where c.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and c.sede_id = new.sede_id
      and c.dia_semana = new.dia_semana
      and c.activa
      and c.hora_inicio < new.hora_fin
      and c.hora_fin > new.hora_inicio
  ) into v_conflicto;

  if v_conflicto then
    raise exception 'Ya hay otra clase activa en esta sede, este día y este horario -- elegí otro horario o desactivá la existente primero';
  end if;

  return new;
end;
$$;

create trigger trg_validar_solapamiento_clase
  before insert or update on public.clases
  for each row execute function public.fn_validar_solapamiento_clase();
