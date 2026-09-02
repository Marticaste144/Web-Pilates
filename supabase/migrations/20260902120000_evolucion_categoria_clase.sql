-- ============================================================================
-- MUV Gimnasia Postural — Evolución del alumno (BLOQUE 3, Tarea 2)
--
-- La evolución longitudinal reutiliza `ficha_evaluacion_notas` (ya existe,
-- ya es append-only, ya tiene su RLS) -- no se crea una tabla paralela. Se
-- le agregan solo las dos cosas que pedía la tarea y que hoy no tiene:
-- categoría y clase relacionada opcional.
-- ============================================================================

alter table public.ficha_evaluacion_notas
  add column categoria text not null default 'seguimiento_general'
    check (categoria in (
      'seguimiento_general',
      'molestia_dolor',
      'mejora_progreso',
      'cambio_objetivo',
      'adaptacion',
      'reevaluacion'
    )),
  add column clase_id uuid references public.clases (id) on delete set null;

comment on column public.ficha_evaluacion_notas.categoria is 'Tipo de entrada de evolución (seguimiento/dolor/mejora/objetivo/adaptación/reevaluación).';
comment on column public.ficha_evaluacion_notas.clase_id is 'Clase relacionada, opcional -- ej. "se adaptó tal ejercicio en la clase del martes".';
