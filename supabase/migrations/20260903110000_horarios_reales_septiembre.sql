-- ============================================================================
-- MUV Gimnasia Postural — Carga real de horarios (BLOQUE DATOS REALES, Tarea 2)
--
-- Reemplaza los datos demo por la grilla real exacta pasada por Laura.
-- Mapeo de "sede N" (nomenclatura interna de MUV) a sedes reales de la base
-- (verificado: son las únicas 3 sedes que existen, y Sede 55 ya venía
-- confirmada como MUV POSTURAL desde el bloque de planificaciones grupales):
--   Sede 55 = MUV POSTURAL   Sede 56 = MUV PILATES   Sede 59 = MUV FITNESS
--
-- Profesores SIN cuenta de acceso todavía (Rocío, Gabriela, Mariel, Gonzalo,
-- Nicolás, Nacho, Analía, Matías, Sofía, Yayi, Camila, Alan, Pablo, Richard):
-- quedan con profesor_id NULL y profesor_pendiente_nombre = su nombre real
-- (nunca un apodo -- Sofía/Camila/Matías/Gonzalo ya van con el nombre
-- normalizado desde el día uno). Ver migración anterior para el porqué.
--
-- Todos los horarios demo viejos (34 clases) se desactivan primero (activa
-- = false) -- NO se borran: conservan su historial real de inscripciones/
-- asistencias/pagos. La única excepción es la clase que YA coincidía
-- exactamente con la grilla real (Sede 55, jueves 19-20, Funcional, grupal)
-- -- la migración anterior (20260903090000) la dejó afuera del "desactivar"
-- para no perder su id/historial, pero todavía apuntaba a Carla (demo,
-- profesor_id viejo) -- se reasigna a "Matías" (pendiente) ACÁ ABAJO, antes
-- del resto de la carga.
--
-- CORRECCIÓN (intento fallido -- ver informe): esta migración nunca llegó a
-- aplicarse, falló en el primer INSERT (Sabina, Sede 56) por un
-- 23514/chk_clases_profesor_identificado -- v_sabina buscaba apellido
-- "Duarte" (dato mal anotado en 20260903090000) y el nombre real es
-- "Bocca", así que la búsqueda daba NULL y el INSERT no traía
-- profesor_pendiente_nombre para cubrirlo. Se corrige el apellido acá abajo
-- y se agrega una guarda al principio del bloque (si ya hay alguna clase
-- con profesor_pendiente_nombre, no se vuelve a correr) para que un
-- reintento -- de este fallo o de cualquier corrida futura después de un
-- éxito -- nunca duplique la grilla. El intento fallido en sí no dejó nada
-- a medias: Postgres aborta todo el statement batch ante un error dentro de
-- una misma transacción implícita, y se confirmó con una consulta de solo
-- lectura que ni el UPDATE de desactivación ni ningún INSERT llegaron a
-- commitear (34 clases totales, 27 activas, 0 con profesor_pendiente_nombre
-- -- exactamente el estado previo a cualquier intento).
--
-- Actividad/modalidad: SOLO se clasifican como confirmadas (grupal) los
-- horarios que ya estaban confirmados como reales en el bloque anterior de
-- planificaciones grupales -- ver el WHERE de los dos UPDATE al final. Todo
-- lo demás en Sede 55/59 (los horarios "de instructor" que no estaban en esa
-- lista) queda con actividad/modalidad SIN DEFINIR a propósito: no se
-- inventa a qué actividad puntual corresponde cada uno -- Admin lo completa
-- a mano desde /admin/clases cuando lo confirme. Sede 56 es 100% Pilates
-- (así lo indica la grilla), y Pilates en MUV es una clase grupal por
-- diseño de negocio (confirmado en el bloque anterior: "las adaptaciones se
-- hacen durante la clase", no hay planificación 1:1) -- se carga directo
-- como grupal.
-- ============================================================================

-- 0) Guarda de re-ejecución, antes de tocar nada: si ya hay alguna clase
-- con profesor_pendiente_nombre, esta migración ya se aplicó antes --
-- cortar acá evita duplicar toda la grilla (los INSERT de más abajo no son
-- idempotentes por sí solos). Puesta como primer statement del archivo
-- para que, en un reintento después de un éxito previo, ni siquiera llegue
-- a tocar el UPDATE de desactivación de abajo.
do $$
begin
  if exists (select 1 from public.clases where profesor_pendiente_nombre is not null) then
    raise exception 'Ya existen clases con profesor_pendiente_nombre -- esta migración ya se aplicó antes, no se vuelve a correr.';
  end if;
end $$;

-- 1) Desactivar TODO el horario demo viejo, salvo la fila que se reasigna
-- a Matías a continuación.
update public.clases
set activa = false
where activa = true
  and id <> '57fa3538-46ee-47bc-bc3c-0be3a89a93d3';

-- 2) Esa fila (Sede 55, jueves 19-20, Funcional/grupal -- ya venía con
-- actividad_id/modalidad correctos, no se tocan) todavía apuntaba a Carla
-- (demo). Se reasigna a Matías (pendiente de cuenta, como el resto de sus
-- horarios en esta misma migración) para no perder su id/historial.
update public.clases
set profesor_id = null,
    profesor_pendiente_nombre = 'Matías'
where id = '57fa3538-46ee-47bc-bc3c-0be3a89a93d3';

do $$
declare
  v_sede_pilates uuid := (select id from public.sedes where nombre = 'MUV PILATES');
  v_sede_postural uuid := (select id from public.sedes where nombre = 'MUV POSTURAL');
  v_sede_fitness uuid := (select id from public.sedes where nombre = 'MUV FITNESS');
  v_act_pilates uuid := (select id from public.actividades where nombre = 'Pilates');
  v_act_stretching uuid := (select id from public.actividades where nombre = 'Stretching');
  v_act_ritmo uuid := (select id from public.actividades where nombre = 'Ritmo');
  v_sabina uuid := (select p.id from public.profiles p where p.nombre = 'Sabina' and p.apellido = 'Bocca');
  v_laila uuid := (select p.id from public.profiles p where p.nombre = 'Laila' and p.apellido = 'Casin');
begin
  if v_sabina is null then
    raise exception 'No se encontró el profile de Sabina (nombre=Sabina, apellido=Bocca) -- revisar antes de continuar.';
  end if;
  if v_laila is null then
    raise exception 'No se encontró el profile de Laila (nombre=Laila, apellido=Casin) -- revisar antes de continuar.';
  end if;

  -- --------------------------------------------------------------------
  -- SEDE 56 (MUV PILATES) — cupo 6 — 100% Pilates, grupal.
  -- --------------------------------------------------------------------
  insert into public.clases (sede_id, profesor_id, dia_semana, hora_inicio, hora_fin, cupo, actividad_id, modalidad)
  select v_sede_pilates, v_sabina, dia, hora, hora + interval '1 hour', 6, v_act_pilates, 'grupal'
  from unnest(
    array[1,1,1,1, 2,2,2, 3,3,3,3,3, 4,4,4,4,4, 5,5,5,5],
    array['16:00','17:00','18:00','19:00', '15:00','16:00','17:00', '09:00','16:00','17:00','18:00','19:00', '15:00','16:00','17:00','18:00','19:00', '09:00','17:00','18:00','19:00']::time[]
  ) as t(dia, hora);

  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo, actividad_id, modalidad)
  select v_sede_pilates, null, 'Rocío', dia, hora, hora + interval '1 hour', 6, v_act_pilates, 'grupal'
  from unnest(
    array[1,1, 2, 3,3, 4, 5,5],
    array['13:30','14:30', '12:30', '13:30','14:30', '12:30', '11:00','16:00']::time[]
  ) as t(dia, hora);

  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo, actividad_id, modalidad)
  select v_sede_pilates, null, 'Gabriela', dia, hora, hora + interval '1 hour', 6, v_act_pilates, 'grupal'
  from unnest(
    array[1,1, 3,3],
    array['10:00','11:00', '10:00','11:00']::time[]
  ) as t(dia, hora);

  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo, actividad_id, modalidad)
  select v_sede_pilates, null, 'Mariel', dia, hora, hora + interval '1 hour', 6, v_act_pilates, 'grupal'
  from unnest(
    array[2,2, 4,4],
    array['08:00','10:00', '08:00','10:00']::time[]
  ) as t(dia, hora);

  -- --------------------------------------------------------------------
  -- SEDE 55 (MUV POSTURAL) — cupo 7 — Postural/Funcional sin discriminar
  -- todavía (actividad/modalidad se completan más abajo SOLO para los
  -- horarios ya confirmados como grupales en el bloque anterior).
  -- --------------------------------------------------------------------
  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo)
  select v_sede_postural, null, 'Gonzalo', dia, hora, hora + interval '1 hour', 7
  from unnest(array[1,3,5], array['08:00','08:00','08:00']::time[]) as t(dia, hora);

  insert into public.clases (sede_id, profesor_id, dia_semana, hora_inicio, hora_fin, cupo)
  select v_sede_postural, v_laila, dia, hora, hora + interval '1 hour', 7
  from unnest(array[2,4], array['08:00','08:00']::time[]) as t(dia, hora);

  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo)
  select v_sede_postural, null, 'Nicolás', dia, hora, hora + interval '1 hour', 7
  from unnest(array[1,5], array['16:00','16:00']::time[]) as t(dia, hora);

  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo)
  select v_sede_postural, null, 'Nacho', dia, hora, hora + interval '1 hour', 7
  from unnest(array[2,4,5], array['16:00','16:00','17:00']::time[]) as t(dia, hora);

  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo)
  select v_sede_postural, null, 'Analía', dia, hora, hora + interval '1 hour', 7
  from unnest(array[1,3], array['17:00','16:00']::time[]) as t(dia, hora);

  -- Matías Sede 55: 4 franjas reales (Mar/Jue 18-19 y 19-20), pero Jue 19-20
  -- YA existe (fila reasignada arriba) -- acá solo se insertan las 3 que
  -- faltan.
  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo)
  select v_sede_postural, null, 'Matías', dia, hora, hora + interval '1 hour', 7
  from unnest(array[2,4,2], array['18:00','18:00','19:00']::time[]) as t(dia, hora);

  -- --------------------------------------------------------------------
  -- SEDE 59 (MUV FITNESS) — cupo 12.
  -- --------------------------------------------------------------------
  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo)
  select v_sede_fitness, null, 'Sofía', dia, hora, hora + interval '1 hour', 12
  from unnest(array[1,3, 2,4], array['08:00','08:00', '18:00','18:00']::time[]) as t(dia, hora);

  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo)
  select v_sede_fitness, null, 'Yayi', dia, hora, hora + interval '1 hour', 12
  from unnest(
    array[1,3,5, 2,4, 3,3,5,5],
    array['08:00','08:00','08:00', '15:00','15:00', '16:00','17:00','16:00','17:00']::time[]
  ) as t(dia, hora);

  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo)
  select v_sede_fitness, null, 'Matías', dia, hora, hora + interval '1 hour', 12
  from unnest(
    array[2,2,2, 4,4,4],
    array['08:00','15:00','17:00', '08:00','15:00','17:00']::time[]
  ) as t(dia, hora);

  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo)
  select v_sede_fitness, null, 'Camila', dia, hora, hora + interval '1 hour', 12
  from unnest(array[1,3,3], array['15:00','15:00','16:00']::time[]) as t(dia, hora);

  insert into public.clases (sede_id, profesor_id, dia_semana, hora_inicio, hora_fin, cupo)
  select v_sede_fitness, v_laila, dia, hora, hora + interval '1 hour', 12
  from unnest(array[3,5,5], array['15:00','15:00','16:00']::time[]) as t(dia, hora);

  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo)
  select v_sede_fitness, null, 'Alan', dia, hora, hora + interval '1 hour', 12
  from unnest(array[1,5], array['18:00','15:00']::time[]) as t(dia, hora);

  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo)
  select v_sede_fitness, null, 'Gonzalo', dia, hora, hora + interval '1 hour', 12
  from unnest(
    array[2,2,2, 3,3, 4,4,4, 5,5],
    array['17:00','18:00','20:00', '17:00','19:00', '17:00','18:00','20:00', '17:00','19:00']::time[]
  ) as t(dia, hora);

  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo)
  select v_sede_fitness, null, 'Pablo', dia, hora, hora + interval '1 hour', 12
  from unnest(
    array[1,1, 3, 5,5],
    array['19:00','20:00', '20:00', '19:00','20:00']::time[]
  ) as t(dia, hora);

  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo)
  select v_sede_fitness, null, 'Nicolás', dia, hora, hora + interval '1 hour', 12
  from unnest(array[1,3], array['20:00','20:00']::time[]) as t(dia, hora);

  -- Stretching y Ritmos (sábado) -- sede no especificada en la grilla,
  -- se ubican en Sede 59/FITNESS por ser las mismas actividades ya
  -- clasificadas ahí en el resto del sistema (Stretching/Ritmo son
  -- actividades de tipo fitness, igual que Funcional/Fuerza) -- a
  -- confirmar con Laura si corresponde otra sede.
  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo, actividad_id, modalidad)
  values (v_sede_fitness, null, 'Nicolás', 6, '11:00', '12:00', 12, v_act_stretching, 'grupal');

  insert into public.clases (sede_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin, cupo, actividad_id, modalidad)
  values (v_sede_fitness, null, 'Richard', 6, '15:00', '16:00', 12, v_act_ritmo, 'grupal');
end $$;

-- --------------------------------------------------------------------------
-- Clasificación de los horarios YA confirmados como grupales en el bloque
-- anterior (planificaciones grupales) -- el resto de Sede 55/59 queda sin
-- actividad/modalidad definida a propósito.
-- --------------------------------------------------------------------------
update public.clases c
set actividad_id = (select id from public.actividades where nombre = 'Funcional'),
    modalidad = 'grupal'
from public.sedes s
where c.sede_id = s.id
  and c.activa = true
  and c.actividad_id is null
  and (
    (s.nombre = 'MUV POSTURAL' and c.dia_semana in (2, 4) and c.hora_inicio = '19:00:00')
    or (s.nombre = 'MUV FITNESS' and c.dia_semana in (1, 3, 5) and c.hora_inicio = '19:00:00')
  );

update public.clases c
set actividad_id = (select id from public.actividades where nombre = 'Fuerza'),
    modalidad = 'grupal'
from public.sedes s
where c.sede_id = s.id
  and c.activa = true
  and c.actividad_id is null
  and s.nombre = 'MUV FITNESS'
  and c.dia_semana between 1 and 5
  and c.hora_inicio = '20:00:00';

-- La clase reasignada a Matías (Sede 55, jueves 19-20) ya tenía
-- actividad_id/modalidad correctos desde el bloque anterior -- no hace
-- falta tocarla acá, solo confirmamos que sigue coincidiendo con la regla.
