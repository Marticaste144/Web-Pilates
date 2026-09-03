-- ============================================================================
-- MUV Gimnasia Postural — "Nuestro equipo" público incluye profesores reales
-- sin cuenta todavía
--
-- v_profesores_publicos (20260901090000) solo puede mostrar profesores que
-- YA tienen profiles+profesores (cuenta creada). Pero la mayor parte de la
-- plantilla real cargada en 20260903110000 todavía no tiene cuenta --
-- profesor_pendiente_nombre en vez de profesor_id, a propósito: no se
-- inventan emails/cuentas (ver esa migración y la decisión registrada ahí).
-- Sin esto, la landing solo mostraría a quienes ya tienen cuenta (hoy: 3
-- personas) en vez de a toda la plantilla real que corresponde mostrar.
--
-- Vista nueva y angosta, mismo criterio que v_profesores_publicos: corre con
-- privilegios de postgres y filtra en el WHERE, así no hace falta abrir toda
-- la tabla "clases" a anon (esa sí tiene horarios/cupos, que no son
-- públicos). Devuelve solo el nombre -- no hay apellido para alguien sin
-- profile todavía, y la landing tampoco lo necesita (solo primer nombre).
-- ============================================================================
create or replace view public.v_profesores_pendientes_publicos as
select distinct profesor_pendiente_nombre as nombre
from public.clases
where activa = true and profesor_pendiente_nombre is not null;

comment on view public.v_profesores_pendientes_publicos is
  'Nombres de profesores reales activos sin cuenta de acceso todavía -- ver lib/landing/profesores-data.ts. Se deja de listar acá solo, automáticamente, en cuanto ese nombre se vincule a una cuenta real (deja de haber clases.profesor_pendiente_nombre con ese valor).';

grant select on public.v_profesores_pendientes_publicos to anon, authenticated;
