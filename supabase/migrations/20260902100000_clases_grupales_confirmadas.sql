-- ============================================================================
-- MUV Gimnasia Postural — Clasifica como GRUPAL las clases reales confirmadas
--
-- Laura confirmó 10 horarios como grupales (ver resumen de la tarea para el
-- detalle completo). Antes de escribir esta migración se revisaron TODAS
-- las clases existentes (por sede + actividad + día + horario) para no
-- inventar ni duplicar nada -- resultado: de esos 10 horarios, SOLO UNO
-- coincide con una clase que ya existe:
--
--   MUV POSTURAL (Sede 55) · Funcional · Jueves 19:00-20:00
--
-- Los otros 9 (Sede 55 Funcional martes; Sede 59 Funcional lunes/miércoles/
-- viernes; Sede 59 Fuerza lunes a viernes) NO tienen ninguna clase cargada
-- en esos días/horarios todavía -- no se crean acá (inventaría profesor,
-- cupo e id) -- Admin las carga desde /admin/clases cuando defina quién las
-- va a dar, y ya puede elegir actividad+modalidad="grupal" ahí mismo (ver
-- Tarea 3 de la iteración anterior).
--
-- El UPDATE matchea por sede+día+horario (no por un UUID pegado a mano) para
-- que quede auditable y sea seguro de re-correr -- no toca profesor_id,
-- cupo, inscripciones ni el id de la clase.
-- ============================================================================

update public.clases c
set actividad_id = (select id from public.actividades where nombre = 'Funcional'),
    modalidad = 'grupal'
from public.sedes s
where c.sede_id = s.id
  and s.nombre = 'MUV POSTURAL'
  and c.dia_semana = 4 -- jueves (1=lunes..7=domingo)
  and c.hora_inicio = '19:00:00'
  and c.hora_fin = '20:00:00';
