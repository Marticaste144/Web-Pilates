-- ============================================================================
-- MUV Gimnasia Postural — Feedback de clase (alumna -> profesor)
-- Comentario corto que la alumna deja después de una clase (ej. "me quedó
-- doliendo la zona lumbar"), asociado a ella, la clase y la fecha. Visible
-- para el/los profesores de esa clase, ordenado por más reciente.
-- ============================================================================

create table public.feedback_clases (
  id uuid primary key default gen_random_uuid(),
  clase_id uuid not null references public.clases (id) on delete cascade,
  alumno_id uuid not null references public.alumnos (profile_id) on delete cascade,
  fecha date not null check (fecha <= current_date),
  comentario text not null check (char_length(btrim(comentario)) between 1 and 1000),
  created_at timestamptz not null default now()
);

comment on table public.feedback_clases is
  'Comentario corto de la alumna sobre una sesión puntual de una clase -- solo lectura para profesor/admin, sin edición posterior.';

create index idx_feedback_clases_clase on public.feedback_clases (clase_id, created_at desc);
create index idx_feedback_clases_alumno on public.feedback_clases (alumno_id);

alter table public.feedback_clases enable row level security;

create policy "alumno deja feedback de sus propias clases"
  on public.feedback_clases for insert
  with check (
    alumno_id = auth.uid()
    and exists (
      select 1 from public.inscripciones i
      where i.alumno_id = auth.uid() and i.clase_id = clase_id and i.estado = 'activa'
    )
  );

create policy "alumno ve su propio feedback"
  on public.feedback_clases for select
  using (alumno_id = auth.uid());

create policy "profesor ve feedback de sus clases"
  on public.feedback_clases for select
  using (exists (select 1 from public.clases c where c.id = clase_id and c.profesor_id = auth.uid()));

create policy "admin gestiona feedback"
  on public.feedback_clases for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');
