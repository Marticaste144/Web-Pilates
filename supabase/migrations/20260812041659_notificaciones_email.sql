-- ============================================================================
-- MUV Gimnasia Postural — Notificaciones por email
-- 1) Promoción automática de lista de espera (no existía: posicion_espera se
--    asignaba al anotarse, pero nadie pasaba de lista_espera a activa cuando
--    se liberaba un lugar -- eso quedaba "pendiente" desde el paso 5b).
-- 2) Columnas de control para no volver a mandar el mismo email de
--    cuota por vencer / vencida más de una vez por ciclo de pago.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Promueve automáticamente al primero en la lista de espera cuando se libera
-- un lugar (una inscripción activa pasa a baja). Es un invariante duro del
-- negocio (paso 5b, sección FIFO) -- vive acá, no en la app, por el mismo
-- motivo que fn_asignar_posicion_espera: cualquier código que pueda poner una
-- inscripción en 'baja' (hoy solo darseDeBaja, pero podría sumarse una baja
-- hecha por la admin en el futuro) dispara la promoción sin tener que
-- acordarse de repetir la lógica en cada lugar nuevo.
--
-- Recorre a los candidatos en orden de posicion_espera y promueve al primero
-- que pase las validaciones (superposición de horario, límite de 4 clases
-- semanales, aviso activo bloqueando la sede) -- si el primero no puede
-- (por ejemplo, se anotó a otra clase en el mismo horario mientras esperaba),
-- prueba con el siguiente en vez de dejar el lugar sin asignar.
--
-- El email de aviso ("ya tenés tu lugar") NO se manda desde acá -- Postgres
-- no puede hacer HTTP sin extensiones adicionales que este proyecto no usa.
-- Lo manda darseDeBaja (lib/alumno/inscripciones-actions.ts) después de
-- hacer el update, comparando qué candidato terminó con estado='activa'.
create or replace function public.fn_promover_lista_espera()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_candidato record;
begin
  if new.estado = 'baja' and old.estado = 'activa' then
    for v_candidato in
      select id from public.inscripciones
      where clase_id = new.clase_id and estado = 'lista_espera'
      order by posicion_espera asc
    loop
      begin
        update public.inscripciones
        set estado = 'activa', posicion_espera = null
        where id = v_candidato.id;
        exit; -- se pudo promover a este candidato, no hace falta seguir
      exception when others then
        -- Este candidato no puede tomar el lugar ahora mismo (superposición
        -- de horario, límite semanal, aviso activo, etc.) -- se prueba con
        -- el siguiente en la fila en vez de dejar el lugar libre.
        continue;
      end;
    end loop;
  end if;

  return new;
end;
$$;

create trigger trg_promover_lista_espera
  after update on public.inscripciones
  for each row execute function public.fn_promover_lista_espera();

-- ---------------------------------------------------------------------------
-- Control de envío de los emails de cuota por vencer / vencida: cada fila de
-- "pagos" es un ciclo de cobro propio (paso 2), así que estas columnas
-- arrancan en null en cada ciclo nuevo automáticamente -- no hace falta
-- resetearlas a mano.
-- ---------------------------------------------------------------------------
alter table public.pagos
  add column notificado_por_vencer_en timestamptz,
  add column notificado_vencida_en timestamptz;

comment on column public.pagos.notificado_por_vencer_en is
  'Cuándo se mandó el email de "cuota por vencer" para este ciclo. Null = todavía no se mandó.';
comment on column public.pagos.notificado_vencida_en is
  'Cuándo se mandó el email de "cuota vencida" para este ciclo. Null = todavía no se mandó.';
