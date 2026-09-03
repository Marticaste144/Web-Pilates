-- ============================================================================
-- MUV Gimnasia Postural — Aranceles reales de septiembre, por ACTIVIDAD
--
-- El modelo viejo cobraba por SEDE (aranceles.sede_id): tenía sentido
-- cuando sede=actividad (1 a 1). Desde que una sede puede ofrecer varias
-- actividades con precios distintos (ej. MUV POSTURAL tiene Postural Y
-- Funcional a precios diferentes -- ver tabla de precios real de este
-- bloque), cobrar por sede ya no alcanza. Se agrega actividad_id como
-- alternativa: una fila de arancel ahora es POR SEDE (histórico, se
-- preserva tal cual -- no se toca ni una fila vieja) O POR ACTIVIDAD
-- (nuevo, lo que se carga de acá en más), nunca las dos a la vez.
--
-- "Libre" (Funcional/Fuerza/Stretching/Ritmo) se modela como
-- clases_por_semana = 0 -- mismo campo, sin agregar una columna aparte para
-- un solo caso especial. Funcional, Fuerza, Stretching y Ritmo comparten
-- exactamente el mismo precio en cada franja (confirmado por Laura) -- se
-- cargan como 4 filas idénticas, una por actividad real, en vez de
-- inventar una "categoría de precio" que no existe en el resto del
-- sistema: así una consulta simple por actividad_id alcanza siempre, sin
-- tabla de mapeo extra.
--
-- Valores TODAVÍA sin confirmar (a propósito NO se inventan):
--   - Funcional/Fuerza/Stretching/Ritmo, 4x semanales (pendiente $63k/$64k)
--   - "Combinado" (mencionado por Laura -- significado y precio todavía sin
--     definir; NO es sinónimo de "3x" ni de "3 o más actividades", es un
--     concepto aparte que no se automatiza hasta que lo confirme)
-- Quedan sin fila -- Admin las carga desde /admin/aranceles en cuanto se
-- confirmen, con el mismo formulario que ya existe.
--
-- La regla de "dos actividades: la MÁS CARA al 20% off, la otra al 100%"
-- (confirmado por Laura, ej. Pilates 2x $61.000 -> $48.800 + Postural 1x
-- $44.000 -> total $92.800) es un CÁLCULO por actividad, no por sede -- se
-- compara entre las dos actividades del alumno aunque estén en sedes
-- distintas (ver aplicarDescuentoDosActividades en lib/cuota-calculo.ts).
-- Para 3 o más actividades no hay regla confirmada: se suman completas. No
-- hace falta ninguna tabla nueva para nada de esto.
-- ============================================================================

alter table public.aranceles
  alter column sede_id drop not null,
  add column actividad_id uuid references public.actividades (id) on delete restrict;

alter table public.aranceles
  add constraint chk_aranceles_categoria check (
    (sede_id is not null and actividad_id is null)
    or (sede_id is null and actividad_id is not null)
  );

-- "Libre" = sin límite semanal, no una frecuencia fija -- se admite 0 además
-- de 1-4. La constraint vieja (clases_por_semana between 1 and 4) se
-- reemplaza por esta.
alter table public.aranceles drop constraint if exists aranceles_clases_por_semana_check;
alter table public.aranceles add constraint chk_aranceles_clases_por_semana check (clases_por_semana between 0 and 4);

comment on column public.aranceles.clases_por_semana is
  '1-4 = veces por semana. 0 = "Libre" (sin límite semanal), usado en Funcional/Fuerza/Stretching/Ritmo.';
comment on column public.aranceles.actividad_id is
  'Arancel por ACTIVIDAD (modelo nuevo, septiembre en adelante) -- mutuamente excluyente con sede_id (modelo viejo, se preserva para el historial de pagos ya aprobados).';

-- La unicidad vieja (sede_id, clases_por_semana, vigente_desde) no
-- contempla actividad_id -- y una unique constraint común no sirve acá
-- porque Postgres nunca considera dos NULL "iguales" (dos filas por
-- actividad, con sede_id NULL las dos, no chocarían nunca entre sí -- un
-- índice único parcial resolvería eso, pero el .upsert() de supabase-js
-- arma un ON CONFLICT (columnas) sin poder pasarle el WHERE que un índice
-- parcial necesita como "arbiter", así que tampoco serviría acá). Se
-- agrega una columna generada que combina sede_id/actividad_id en un único
-- valor NUNCA nulo (uno de los dos siempre está seteado, ver
-- chk_aranceles_categoria) y se pone la unicidad sobre esa columna --
-- funciona con upsert() común, sin índices parciales.
alter table public.aranceles drop constraint if exists aranceles_sede_id_clases_por_semana_vigente_desde_key;

alter table public.aranceles
  add column categoria_key text generated always as (coalesce(sede_id::text, '') || ':' || coalesce(actividad_id::text, '')) stored;

alter table public.aranceles
  add constraint uq_aranceles_categoria_frecuencia_vigencia
  unique (categoria_key, clases_por_semana, vigente_desde);

-- ---------------------------------------------------------------------------
-- Carga real de septiembre 2026.
-- ---------------------------------------------------------------------------
insert into public.aranceles (actividad_id, clases_por_semana, valor_mensual, vigente_desde)
select a.id, v.clases_por_semana, v.valor_mensual, '2026-09-01'
from public.actividades a
join (values (1, 44000), (2, 60000), (3, 64000), (4, 68000)) as v(clases_por_semana, valor_mensual) on true
where a.nombre = 'Postural'
on conflict (categoria_key, clases_por_semana, vigente_desde) do update set valor_mensual = excluded.valor_mensual;

insert into public.aranceles (actividad_id, clases_por_semana, valor_mensual, vigente_desde)
select a.id, v.clases_por_semana, v.valor_mensual, '2026-09-01'
from public.actividades a
join (values (1, 45000), (2, 61000), (3, 66000), (4, 70000)) as v(clases_por_semana, valor_mensual) on true
where a.nombre = 'Pilates'
on conflict (categoria_key, clases_por_semana, vigente_desde) do update set valor_mensual = excluded.valor_mensual;

-- Funcional, Fuerza, Stretching, Ritmo: mismo precio, 4 actividades reales
-- (no se agrupan -- pedido explícito de no agrupar actividades). 4x queda
-- SIN cargar a propósito (pendiente $63k/$64k, todavía sin confirmar).
insert into public.aranceles (actividad_id, clases_por_semana, valor_mensual, vigente_desde)
select a.id, v.clases_por_semana, v.valor_mensual, '2026-09-01'
from public.actividades a
join (values (1, 43000), (2, 54000), (3, 59000), (0, 69000)) as v(clases_por_semana, valor_mensual) on true
where a.nombre in ('Funcional', 'Fuerza', 'Stretching', 'Ritmo')
on conflict (categoria_key, clases_por_semana, vigente_desde) do update set valor_mensual = excluded.valor_mensual;
