-- ============================================================================
-- MUV Gimnasia Postural — Confirmación de asistencia + carga manual (profesor)
--
-- Hasta ahora "asistencias" solo servía para que el profesor marcara
-- presente/ausente sobre TODO el roster de la clase. Se suma:
--   1) confirmado: la alumna confirma que va a ir (1hs antes de la clase,
--      vía su propia vista) -- la fila la crea ella, el profesor solo marca
--      presente/ausente sobre las que ya confirmaron.
--   2) Carga manual del profesor para quien no confirmó a tiempo:
--      a) alumna de la propia clase (agregado_manualmente = true, no_registrado = false)
--      b) alumna de recuperación que NO pertenece a esta clase/sede
--         (no_registrado = true, con datos sueltos de texto libre porque no
--         hay alumno_id que referenciar).
--   3) es_recuperacion: tag booleano preparado para el futuro (marcar
--      visualmente en la lista de confirmados quién viene a recuperar) --
--      no hay todavía una función de recuperación de turnos, así que por
--      ahora nadie la setea, pero el campo ya existe.
-- ============================================================================

alter table public.asistencias
  alter column alumno_id drop not null;

alter table public.asistencias
  add column confirmado boolean not null default false,
  add column es_recuperacion boolean not null default false,
  add column agregado_manualmente boolean not null default false,
  add column no_registrado boolean not null default false,
  add column manual_nombre text,
  add column manual_apellido text,
  add column manual_sede_habitual text,
  add column manual_profesor_habitual text;

comment on column public.asistencias.confirmado is
  'true = la propia alumna confirmó que va a esta clase (botón habilitado 1hs antes). No implica presente: eso lo sigue marcando el profesor.';
comment on column public.asistencias.es_recuperacion is
  'Tag preparado para la futura función de recuperación de turnos -- hoy nadie lo setea, se deja para marcar visualmente más adelante quién viene a recuperar.';
comment on column public.asistencias.agregado_manualmente is
  'true = la fila la creó el profesor a mano (la alumna no confirmó a tiempo), no la propia alumna.';
comment on column public.asistencias.no_registrado is
  'true = carga manual de alguien que NO pertenece a esta clase/sede (ej. recuperación cruzada de sede, que no debería pasar pero puede pasar). alumno_id queda null y se completan los manual_* en su lugar, para que quede trazable.';

-- O es un alumno real del sistema (no_registrado = false, alumno_id
-- obligatorio) o es una carga manual de alguien sin cuenta (no_registrado =
-- true, sin alumno_id, con nombre/apellido a mano) -- nunca las dos cosas ni
-- ninguna de las dos.
alter table public.asistencias
  add constraint chk_asistencias_no_registrado check (
    (no_registrado = false and alumno_id is not null)
    or
    (no_registrado = true and alumno_id is null and manual_nombre is not null and manual_apellido is not null)
  );

-- ---------------------------------------------------------------------------
-- La alumna confirma su propia asistencia: solo puede crear/tocar su propia
-- fila, nunca marcar estado (presente/ausente le sigue correspondiendo al
-- profesor), y solo mientras esa fila siga sin marcar.
-- ---------------------------------------------------------------------------
create policy "alumno confirma su propia asistencia"
  on public.asistencias for insert
  with check (
    alumno_id = auth.uid()
    and confirmado = true
    and estado is null
    and agregado_manualmente = false
    and no_registrado = false
    and exists (
      select 1 from public.inscripciones i
      where i.alumno_id = auth.uid() and i.clase_id = clase_id and i.estado = 'activa'
    )
  );

create policy "alumno actualiza su confirmacion"
  on public.asistencias for update
  using (alumno_id = auth.uid() and estado is null)
  with check (alumno_id = auth.uid() and estado is null);

-- ---------------------------------------------------------------------------
-- Ventana de confirmación: se habilita 1hs antes del horario de inicio de la
-- clase y se cierra cuando la clase termina. Solo aplica a la propia alumna
-- confirmando -- el profesor/admin pueden cargar presente/ausente o altas
-- manuales en cualquier momento, sin esta restricción.
-- ---------------------------------------------------------------------------
create or replace function public.fn_validar_ventana_confirmacion_asistencia()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_hora_inicio time;
  v_hora_fin time;
  v_inicio_clase timestamptz;
  v_fin_clase timestamptz;
begin
  if public.fn_current_role() <> 'alumno' or new.confirmado is distinct from true then
    return new;
  end if;

  select hora_inicio, hora_fin into v_hora_inicio, v_hora_fin
  from public.clases where id = new.clase_id;

  v_inicio_clase := (new.fecha::text || ' ' || v_hora_inicio::text)::timestamp
    at time zone 'America/Argentina/Buenos_Aires';
  v_fin_clase := (new.fecha::text || ' ' || v_hora_fin::text)::timestamp
    at time zone 'America/Argentina/Buenos_Aires';

  if now() < v_inicio_clase - interval '1 hour' then
    raise exception 'Todavía no podés confirmar esta clase: se habilita 1 hora antes del inicio.';
  end if;

  if now() > v_fin_clase then
    raise exception 'Esta clase ya terminó, no se puede confirmar asistencia.';
  end if;

  return new;
end;
$$;

create trigger trg_validar_ventana_confirmacion_asistencia
  before insert or update on public.asistencias
  for each row execute function public.fn_validar_ventana_confirmacion_asistencia();
