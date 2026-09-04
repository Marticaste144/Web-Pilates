-- ============================================================================
-- MUV Gimnasia Postural — "Nuestro equipo" público muestra sede/actividad reales
--
-- El nuevo carrusel de "Nuestro equipo" (landing) quiere mostrar, debajo de
-- cada foto, la/s actividad/es y sede/s reales de cada profesor -- dato que
-- ya existe (clases.sede_id/actividad_id), pero "clases" no es una tabla
-- pública (RLS: solo `authenticated`, tiene horarios/cupos que no son para
-- mostrar sin sesión). Se extienden las DOS vistas públicas ya usadas por la
-- landing (mismo criterio de siempre: corren con privilegios de postgres,
-- filtran en el WHERE) para que devuelvan también sede_nombre/
-- actividad_nombre -- CREATE OR REPLACE VIEW agregando columnas al FINAL,
-- sin sacar ni renombrar ninguna de las que ya devolvían (Postgres no deja
-- insertar en el medio, y así tampoco rompe nada que ya las lea tal cual
-- estaban).
--
-- Fan-out esperado: como ahora se hace LEFT JOIN contra clases, un profesor
-- con varias clases activas aparece en varias filas (una por sede+actividad
-- distinta) -- lib/landing/profesores-data.ts ya agrupa por profesor y arma
-- los sets de sedes/actividades en TypeScript, no hace falta desduplicar acá
-- con array_agg. Un profesor sin ninguna clase activa todavía sigue
-- apareciendo una vez, con sede_nombre/actividad_nombre en null (LEFT JOIN,
-- no INNER) -- no desaparece de "Nuestro equipo" por no tener horario
-- cargado todavía.
-- ============================================================================

create or replace view public.v_profesores_publicos as
select
  p.id,
  p.nombre,
  p.apellido,
  pr.foto_url,
  s.nombre as sede_nombre,
  act.nombre as actividad_nombre
from public.profiles p
join public.profesores pr on pr.profile_id = p.id
left join public.clases c on c.profesor_id = p.id and c.activa = true
left join public.sedes s on s.id = c.sede_id
left join public.actividades act on act.id = c.actividad_id
where p.role = 'profesor' and pr.activo = true
order by p.apellido, p.nombre;

comment on view public.v_profesores_publicos is
  'Profesores activos con cuenta -- nombre/apellido/foto + sede/actividad reales de sus clases activas (una fila por clase distinta; lib/landing/profesores-data.ts agrupa por profesor). Filtra "activo" en el WHERE porque corre con privilegios de postgres (bypassa RLS).';

create or replace view public.v_profesores_pendientes_publicos as
select
  c.profesor_pendiente_nombre as nombre,
  s.nombre as sede_nombre,
  act.nombre as actividad_nombre
from public.clases c
join public.sedes s on s.id = c.sede_id
left join public.actividades act on act.id = c.actividad_id
where c.activa = true and c.profesor_pendiente_nombre is not null;

comment on view public.v_profesores_pendientes_publicos is
  'Nombres de profesores reales activos sin cuenta de acceso todavía, + sede/actividad reales de sus clases activas (una fila por clase distinta) -- ver lib/landing/profesores-data.ts. Se deja de listar acá solo, automáticamente, en cuanto ese nombre se vincule a una cuenta real.';

grant select on public.v_profesores_publicos to anon, authenticated;
grant select on public.v_profesores_pendientes_publicos to anon, authenticated;
