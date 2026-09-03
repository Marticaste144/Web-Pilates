-- ============================================================================
-- MUV Gimnasia Postural — Gestión de horarios (BLOQUE DATOS REALES, Tarea 3)
--
-- 1) Valida a nivel de base que la actividad de una clase esté realmente
--    ofrecida por su sede (tabla sede_actividades, que hasta ahora solo se
--    usaba para filtrar el <select> en la UI, sin ningún respaldo en la
--    base -- se podía guardar cualquier combinación por SQL Editor o un bug
--    de la app). "hora fin > hora_inicio" y "no superposición" ya estaban
--    cubiertos por constraints/triggers existentes (ver migraciones
--    20260810173955 y 20260903103000).
--
-- 2) El profesor puede crear/editar/desactivar SUS PROPIOS horarios, igual
--    que ya podía la admin con cualquiera -- "no alcanza con esconder
--    botones": esto se protege acá, en RLS, no solo en la UI.
-- ============================================================================

create or replace function public.fn_validar_actividad_de_sede()
returns trigger
language plpgsql
as $$
begin
  if new.actividad_id is null then
    return new;
  end if;

  if not exists (
    select 1 from public.sede_actividades sa
    where sa.sede_id = new.sede_id and sa.actividad_id = new.actividad_id
  ) then
    raise exception 'Esa actividad no está habilitada para esta sede';
  end if;

  return new;
end;
$$;

create trigger trg_validar_actividad_de_sede
  before insert or update on public.clases
  for each row execute function public.fn_validar_actividad_de_sede();

-- ---------------------------------------------------------------------------
-- RLS: el profesor puede insertar/actualizar SOLO clases donde profesor_id
-- sea él mismo -- nunca las "pendientes de cuenta" de otro (no tiene forma
-- de reclamarlas: eso lo hace la admin a mano cuando invite a esa persona).
-- No se toca la policy de admin ("admin gestiona clases" ya cubre todo).
-- ---------------------------------------------------------------------------
create policy "profesor crea sus propias clases"
  on public.clases for insert
  to authenticated
  with check (profesor_id = auth.uid());

create policy "profesor actualiza sus propias clases"
  on public.clases for update
  to authenticated
  using (profesor_id = auth.uid())
  with check (profesor_id = auth.uid());
