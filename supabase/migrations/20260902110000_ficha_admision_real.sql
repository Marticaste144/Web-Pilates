-- ============================================================================
-- MUV Gimnasia Postural — Ficha de admisión real (BLOQUE 3, Tarea 1)
--
-- La ficha genérica de `fichas_evaluacion` (un solo campo "dolores_molestias")
-- se amplía para representar fielmente las 3 páginas de la ficha real en
-- papel (Ficha_de_admision_gimnasio_rellenable.pdf), en vez de crear una
-- segunda tabla/sistema en paralelo -- sigue siendo UNA fila por alumno
-- (mismo criterio ya usado: upsert por alumno_id).
--
-- Verificado antes de escribir esta migración: `fichas_evaluacion` y
-- `ficha_evaluacion_notas` están VACÍAS en producción (0 filas) -- por eso
-- es seguro renombrar una columna y agregar constraints sin perder ni migrar
-- ningún dato real.
--
-- Datos que YA existen en otro lado (profiles.nombre/apellido/telefono/email)
-- NO se duplican acá -- "Edad" sí se agrega como columna porque no existe en
-- ningún lado de la app todavía.
--
-- "Gimnasio" del PDF se modela como sede_id (FK a sedes) -- la app ya tiene
-- 3 sedes reales (MUV FITNESS/POSTURAL/PILATES), no un campo de texto libre.
-- "Ficha N.º" se modela como un identity numérico real (no el uuid interno)
-- para que tenga sentido como número de ficha visible/hablado con la clienta.
-- ============================================================================

alter table public.fichas_evaluacion
  rename column dolores_molestias to observaciones_iniciales;

alter table public.fichas_evaluacion
  add column numero integer generated always as identity unique,
  -- Encabezado (Gimnasio / Fecha / Ficha N.º)
  add column sede_id uuid references public.sedes (id) on delete set null,
  add column fecha_evaluacion date not null default current_date,
  -- "Profesional que evalúa": quien la creó -- distinto de actualizado_por,
  -- que sigue reflejando quién tocó la ficha por última vez. Ambos se
  -- completan solos (auth.uid() / now()) desde la Server Action, nunca los
  -- completa a mano quien carga el formulario.
  add column profesional_evaluador_id uuid references public.profiles (id),
  -- 1) Datos personales y antecedentes
  add column edad smallint check (edad is null or edad between 1 and 120),
  add column medico_deriva text,
  add column actividad_fisica_previa text,
  add column actividad_laboral text,
  add column diagnostico text,
  add column dolor_actual smallint check (dolor_actual is null or dolor_actual between 1 and 10),
  add column dolor_zona_momento text,
  -- 3) Objetivos y planificación -- texto libre, NO crea una planificación
  -- (eso es un sistema aparte, ver planificaciones-data.ts).
  add column objetivo_1 text,
  add column objetivo_2 text,
  add column objetivo_3 text,
  add column observaciones_planificacion text,
  -- Contacto y avisos
  add column contacto_familiar_nombre text,
  add column contacto_familiar_vinculo text,
  add column contacto_familiar_telefono text,
  add column avisos_grupo boolean,
  add column avisos_grupo_numero text,
  -- Días posibles (el PDF no incluye domingo) -- arrays de opciones fijas y
  -- cerradas, no una tabla aparte: a diferencia de los bloques/ejercicios de
  -- planificaciones, acá el conjunto de días/turnos NUNCA crece.
  add column dias_posibles smallint[] check (dias_posibles <@ array[1, 2, 3, 4, 5, 6]::smallint[]),
  add column turnos_posibles text[] check (turnos_posibles <@ array['manana', 'tarde', 'noche']::text[]),
  add column horarios_posibles text;

comment on column public.fichas_evaluacion.numero is 'Número de ficha visible/hablado con la clienta -- no es el id interno.';
comment on column public.fichas_evaluacion.fecha_evaluacion is 'Fecha de la evaluación de ingreso -- no se pisa en ediciones posteriores (ver upsert en fichas-evaluacion-actions.ts).';
comment on column public.fichas_evaluacion.profesional_evaluador_id is 'Quién hizo la evaluación de ingreso -- no se pisa en ediciones posteriores, a diferencia de actualizado_por.';

-- ============================================================================
-- Página 2: Pruebas funcionales.
--
-- Tabla aparte (no columnas sueltas en fichas_evaluacion) por dos razones:
-- 1) son ~9 pruebas con varios campos cada una -- mezclarlas ahí haría una
--    tabla ilegible.
-- 2) el negocio ya adelantó que en el futuro va a haber REEVALUACIONES de
--    estas mismas pruebas para comparar resultados en el tiempo. Por eso
--    esta tabla NO es upsert-por-alumno como fichas_evaluacion: es
--    insert-only, con `es_inicial` marcando la evaluación de ingreso. El
--    índice único parcial garantiza una sola fila "inicial" por alumno, pero
--    no limita cuántas reevaluaciones (es_inicial = false) puede haber más
--    adelante -- no hace falta ningún cambio de esquema para eso, ya está
--    preparado. La UI para cargar una reevaluación queda fuera de este
--    bloque (explícitamente pedido así), pero el modelo ya la soporta.
-- ============================================================================
create table public.ficha_evaluacion_pruebas_funcionales (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.alumnos (profile_id) on delete cascade,
  es_inicial boolean not null default true,
  fecha date not null default current_date,
  autor_id uuid references public.profiles (id),

  elevacion_pierna_recta_derecha text,
  elevacion_pierna_recta_izquierda text,
  elevacion_pierna_recta_obs text,

  flexion_tronco_resultado text,
  flexion_tronco_obs text,

  rotadores_cadera_derecha text,
  rotadores_cadera_izquierda text,
  rotadores_cadera_obs text,

  equilibrio_cerrados_derecha_seg numeric(5, 1),
  equilibrio_cerrados_izquierda_seg numeric(5, 1),
  equilibrio_cerrados_obs text,

  equilibrio_abiertos_derecha_seg numeric(5, 1),
  equilibrio_abiertos_izquierda_seg numeric(5, 1),
  equilibrio_abiertos_obs text,

  alcance_manos_derecha text,
  alcance_manos_izquierda text,
  alcance_manos_obs text,

  angel_pared_distancia_derecha_cm numeric(5, 1),
  angel_pared_distancia_izquierda_cm numeric(5, 1),
  angel_pared_distancia_obs text,

  angel_pared_apoya_nuca boolean,
  angel_pared_apoya_lumbar boolean,
  angel_pared_apoyos_obs text,

  observaciones_generales text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ficha_evaluacion_pruebas_funcionales is
  'Página 2 de la ficha real (pruebas funcionales). Insert-only por diseño -- es_inicial=true es la evaluación de ingreso, preservada para siempre; futuras reevaluaciones son filas nuevas con es_inicial=false.';

create unique index uq_pruebas_funcionales_inicial
  on public.ficha_evaluacion_pruebas_funcionales (alumno_id)
  where es_inicial;

create index idx_pruebas_funcionales_alumno on public.ficha_evaluacion_pruebas_funcionales (alumno_id, fecha desc);

create trigger trg_pruebas_funcionales_updated_at
  before update on public.ficha_evaluacion_pruebas_funcionales
  for each row execute function public.fn_set_updated_at();

alter table public.ficha_evaluacion_pruebas_funcionales enable row level security;

-- Mismo criterio de autorización que fichas_evaluacion/ficha_evaluacion_notas
-- (fn_es_mi_alumno + fn_alumno_visible) -- sin policy de delete a propósito
-- (insert-only, igual que las notas de evolución).
create policy "admin gestiona pruebas funcionales"
  on public.ficha_evaluacion_pruebas_funcionales for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

create policy "profesor ve pruebas funcionales de sus alumnos"
  on public.ficha_evaluacion_pruebas_funcionales for select
  using (public.fn_es_mi_alumno(alumno_id) and public.fn_alumno_visible(alumno_id));

create policy "profesor crea pruebas funcionales de sus alumnos"
  on public.ficha_evaluacion_pruebas_funcionales for insert
  with check (public.fn_es_mi_alumno(alumno_id) and public.fn_alumno_visible(alumno_id));

create policy "profesor actualiza pruebas funcionales de sus alumnos"
  on public.ficha_evaluacion_pruebas_funcionales for update
  using (public.fn_es_mi_alumno(alumno_id) and public.fn_alumno_visible(alumno_id))
  with check (public.fn_es_mi_alumno(alumno_id) and public.fn_alumno_visible(alumno_id));
