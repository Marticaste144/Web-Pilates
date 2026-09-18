-- ============================================================================
-- MUV Gimnasia Postural — Marca explícita de "alumna demo" + visibilidad
--
-- Carga provisoria de alumnas ficticias (bloque "demo para mostrarle el
-- sistema a los profesores") -- necesita una forma inequívoca de distinguir
-- ese dato de uno real para poder borrarlo después sin tocar nada más.
--
-- Un solo booleano en "alumnos" alcanza: todas las tablas que cuelgan de una
-- alumna (inscripciones, asistencias, fichas_evaluacion, ficha_evaluacion_
-- notas, ficha_evaluacion_pruebas_funcionales, planificaciones -- todas con
-- "on delete cascade" hacia alumnos.id, ver 20260906090000_identidad_
-- alumnas.sql) se identifican como demo por transitividad vía alumno_id --
-- no hace falta duplicar el flag en cada una.
--
-- NO se crea ningún pago demo (decisión explícita de la carga: evitar
-- cualquier riesgo de contaminar facturación real). El problema real que
-- eso generaría: fn_alumno_visible() -- la función que ya usan TODAS las
-- policies de fichas/planificaciones/perfil -- exige un pago aprobado para
-- considerar visible a una alumna. Sin pagos, una alumna demo nunca sería
-- visible para ningún profesor. Se resuelve extendiendo esa única función
-- (no cada policy por separado) para que una alumna demo también cuente
-- como visible, sin necesidad de ningún pago.
-- ============================================================================

alter table public.alumnos add column es_demo boolean not null default false;

comment on column public.alumnos.es_demo is
  'true = alumna ficticia cargada para una demostración al equipo de profesores -- nunca una alumna real. Permite identificar y borrar TODA la carga demo (esta fila + todo lo que cuelga de su id) sin tocar nada real. Se borra por completo cuando ya no hace falta -- no es un estado "inactivo": una alumna demo que deja de servir se ELIMINA, no se desmarca.';

-- Índice parcial: la limpieza posterior y cualquier chequeo "¿hay demo
-- cargada?" solo necesitan las filas es_demo=true, que van a ser una
-- minoría chica y transitoria de la tabla.
create index idx_alumnos_es_demo on public.alumnos (es_demo) where es_demo;

create or replace function public.fn_alumno_visible(p_alumno_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pagos where alumno_id = p_alumno_id and estado = 'aprobado'
  )
  or exists (
    select 1 from public.alumnos where id = p_alumno_id and es_demo
  );
$$;
