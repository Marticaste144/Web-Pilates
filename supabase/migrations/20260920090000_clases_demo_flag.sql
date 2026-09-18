-- ============================================================================
-- MUV Gimnasia Postural — Marca explícita de "clase demo"
--
-- Bloque "demo completa para profe prueba" (reunión con profesores reales):
-- a diferencia de la carga anterior (Sabina/Laila, que solo agregó ALUMNAS
-- ficticias a clases YA EXISTENTES y reales), acá hace falta crear clases
-- nuevas para profe prueba -- pedido explícito del usuario, autorizando por
-- primera vez este bloque a inventar clases (nunca antes: ver comentario en
-- cargar-alumnas-demo.mjs). Necesitan la misma marca inequívoca que
-- alumnos.es_demo (20260919090000_alumnas_demo_flag.sql) para poder
-- borrarlas por completo después de la reunión sin tocar la única clase
-- REAL de profe prueba (MUV FITNESS, Ritmo, martes 06:00-07:00, con Tomás
-- Terruli -- el único alumno real del sistema -- ya anotado ahí).
--
-- Todo lo que cuelga de una clase (inscripciones, asistencias,
-- feedback_clases, recuperacion_turnos, planificaciones grupales -- todas
-- con "on delete cascade" hacia clases.id, ver 20260810173955_initial_
-- schema.sql y 20260902090000_planificaciones.sql) se identifica como demo
-- por transitividad vía clase_id -- no hace falta duplicar el flag ahí.
-- Las planificaciones INDIVIDUALES (atadas a alumno_id, no a clase_id) ya
-- quedan cubiertas transitivamente por alumnos.es_demo -- ninguna clase
-- demo necesita marcar nada adicional para eso.
-- ============================================================================

alter table public.clases add column es_demo boolean not null default false;

comment on column public.clases.es_demo is
  'true = clase ficticia creada para una demostración al equipo de profesores -- nunca una clase real. Permite identificar y borrar TODA la carga demo (esta fila + todo lo que cuelga de su id) sin tocar ninguna clase real. Se borra por completo cuando ya no hace falta, igual que alumnos.es_demo.';

-- Índice parcial: mismo criterio que idx_alumnos_es_demo -- van a ser una
-- minoría chica y transitoria de la tabla.
create index idx_clases_es_demo on public.clases (es_demo) where es_demo;
