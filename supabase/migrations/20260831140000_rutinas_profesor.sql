-- ============================================================================
-- MUV Gimnasia Postural — Rutinas de profesor + "Equipo" (paso nuevo)
-- Cada profesor puede ver, agrupados por sede, a los demás profesores y la
-- rutina que viene dando (texto largo y/o archivo) -- si un profesor falta,
-- quien lo reemplaza puede consultarla antes de entrar a dar la clase. Cada
-- profesor edita solo la propia; la de los demás es de solo lectura.
-- ============================================================================

create table public.rutinas_profesor (
  profesor_id uuid primary key references public.profesores (profile_id) on delete cascade,
  contenido text,
  archivo_url text, -- path en el bucket de Storage "rutinas"
  archivo_nombre text, -- nombre original del archivo, para mostrarlo en el link de descarga
  updated_at timestamptz not null default now()
);

comment on table public.rutinas_profesor is
  'Una fila por profesor (se crea/actualiza con upsert por profesor_id) -- texto libre y/o archivo con la rutina que viene dando.';

create trigger trg_rutinas_profesor_updated_at
  before update on public.rutinas_profesor
  for each row execute function public.fn_set_updated_at();

alter table public.rutinas_profesor enable row level security;

create policy "profesores y admin ven todas las rutinas"
  on public.rutinas_profesor for select
  using (public.fn_current_role() in ('admin', 'profesor'));

create policy "profesor gestiona su propia rutina"
  on public.rutinas_profesor for all
  using (profesor_id = auth.uid())
  with check (profesor_id = auth.uid());

create policy "admin gestiona cualquier rutina"
  on public.rutinas_profesor for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

-- ---------------------------------------------------------------------------
-- Storage: bucket privado para el archivo de la rutina -- mismo criterio que
-- "comprobantes" (migración 20260813170000): convención de path
-- <profesor_id>/<archivo>, restringido con storage.foldername(name).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rutinas',
  'rutinas',
  false,
  10485760, -- 10 MiB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "profesor sube su propia rutina"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'rutinas'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profesor actualiza su propia rutina"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'rutinas' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'rutinas' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profesor borra su propia rutina"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'rutinas' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profesores y admin ven archivos de rutinas"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'rutinas' and public.fn_current_role() in ('admin', 'profesor'));
