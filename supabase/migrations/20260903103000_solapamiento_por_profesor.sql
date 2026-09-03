-- ============================================================================
-- MUV Gimnasia Postural — Superposición de horarios: por PROFESOR, no por sede
--
-- La validación original (20260814090000_solapamiento_clases.sql) asumía
-- que una sede es un único espacio físico, así que dos clases no podían
-- superponerse en la misma sede+día+horario, sin importar el profesor. La
-- carga real de horarios (Sede 59 / MUV FITNESS en particular) confirma que
-- eso es falso: hay varias clases en paralelo en el mismo horario (salas
-- distintas) dictadas por profesores distintos -- ej. viernes 19-20 a la
-- vez lo dan Gonzalo Y Pablo.
--
-- El límite real de negocio no es "la sede", es que UNA PERSONA no puede
-- dar dos clases que se pisan en el mismo horario (en ninguna sede). Se
-- redefine la misma función (mismo nombre, mismo trigger ya creado -- no
-- hace falta recrear el trigger) para validar por profesor en vez de por
-- sede. Contempla tanto profesores con cuenta (profesor_id) como los
-- "pendientes de cuenta" cargados por nombre (profesor_pendiente_nombre,
-- ver migración 20260903100000).
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
      and c.dia_semana = new.dia_semana
      and c.activa
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
    raise exception 'Este profesor ya tiene otra clase activa que se superpone con este día y horario -- elegí otro horario o desactivá la existente primero';
  end if;

  return new;
end;
$$;
