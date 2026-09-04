-- ============================================================================
-- MUV Gimnasia Postural — Profesores reales: baja segura de profesores demo
--
-- Verificado antes de escribir esto (consulta de solo lectura en producción):
-- los únicos profesores reales ya bien cargados son Sabina Bocca, Laura
-- Pagola y Laila Casin. Bruno Álvarez, Carla Medina y Tomas Terruli no
-- aparecen en ningún lado de la nómina real confirmada -- son demo.
--
-- CORRECCIÓN (post-intento fallido de 20260903110000): el apellido de
-- Sabina se había anotado mal acá como "Duarte" -- es "Bocca". Esta
-- migración en sí no depende de ese dato (no busca a Sabina, solo da de
-- baja a Bruno/Carla/Tomas), pero el error se arrastró a la búsqueda de
-- v_sabina en 20260903110000_horarios_reales_septiembre.sql, que sí la
-- necesitaba -- ver la corrección en ese archivo.
--
-- "Sofi/Cami/Mati/Gonza" (a normalizar a Sofía/Camila/Matías/Gonzalo) y
-- "Aye/Ayelén" (a excluir) NO existen todavía como profesores en la base
-- bajo ningún nombre -- no hay nada que renombrar/excluir hoy. Sofía,
-- Camila, Matías y Gonzalo entran en esta misma carga real (ver migración
-- de horarios) ya con el nombre correcto desde el principio, nunca con el
-- apodo. Ninguno de los profesores reales de la grilla de horarios tiene
-- cuenta de acceso todavía (decisión explícita: no se inventan emails ni se
-- tocan auth.users -- ver profesor_pendiente_nombre en la migración de
-- horarios), así que Ayelén tampoco existe y no hace falta excluir nada.
--
-- Baja seguraa: SOLO se desactiva (activo=false / activa=false), nunca se
-- borra -- no rompe clases, inscripciones, asistencias, fichas ni
-- planificaciones históricas de esos profesores demo. Sus clases viejas
-- quedan desactivadas (dejan de listarse para anotarse) pero intactas.
-- ============================================================================

update public.profesores
set activo = false
where profile_id in (
  select p.id
  from public.profiles p
  where (p.nombre, p.apellido) in (
    ('Bruno', 'Álvarez'),
    ('Carla', 'Medina'),
    ('Tomas', 'Terruli')
  )
);

update public.clases
set activa = false
where profesor_id in (
  select p.id
  from public.profiles p
  where (p.nombre, p.apellido) in (
    ('Bruno', 'Álvarez'),
    ('Carla', 'Medina'),
    ('Tomas', 'Terruli')
  )
)
-- Excepto la única clase de Carla que SÍ coincide con la grilla real
-- confirmada (Sede 55, jueves 19-20, Funcional, grupal) -- esa fila se
-- reasigna en la migración de horarios en vez de desactivarse, para no
-- perder su historial de inscripciones/asistencias bajo un id nuevo.
and id <> '57fa3538-46ee-47bc-bc3c-0be3a89a93d3';
