-- ============================================================================
-- MUV Gimnasia Postural — Datos iniciales: las 3 sedes son fijas (no hace
-- falta que la admin las cree a mano) y los aranceles placeholder de la
-- sección 5 del doc, iguales en las 3 sedes por ahora. Idempotente: se
-- puede correr más de una vez sin duplicar filas.
-- ============================================================================

insert into public.sedes (nombre)
values ('MUV FITNESS'), ('MUV POSTURAL'), ('MUV PILATES')
on conflict (nombre) do nothing;

insert into public.aranceles (sede_id, clases_por_semana, valor_mensual, vigente_desde)
select s.id, f.clases_por_semana, f.valor_mensual, current_date
from public.sedes s
cross join (
  values (1, 41000), (2, 57000), (3, 62000), (4, 68000)
) as f(clases_por_semana, valor_mensual)
on conflict (sede_id, clases_por_semana, vigente_desde) do nothing;
