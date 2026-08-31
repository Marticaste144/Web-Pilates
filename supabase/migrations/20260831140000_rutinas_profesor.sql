-- ============================================================================
-- MUV Gimnasia Postural — Rutinas de profesor + "Equipo" (paso nuevo)
-- Cada profesor puede ver, agrupados por sede, a los demás profesores y la
-- rutina que viene dando (texto largo y/o archivo) -- si un profesor falta,
-- quien lo reemplaza puede consultarla antes de entrar a dar la clase. Cada
-- profesor edita solo la propia; la de los demás es de solo lectura.
--
-- NOTA (parche, no cambia funcionalidad ni permisos): en Supabase Hosted el
-- rol que corre el SQL Editor no es owner de storage.buckets (a diferencia
-- de storage.objects, donde sí puede crear policies), así que el `insert
-- into storage.buckets` que tenía esta migración fallaba con "must be owner
-- of table buckets". El bucket "rutinas" se crea a mano una sola vez desde
-- el dashboard (Storage > New bucket) -- ver instrucciones en el PR/README.
-- El resto queda igual, reescrito con guards (if not exists / drop policy if
-- exists) para poder correrse de nuevo sin error sobre lo que ya haya
-- quedado creado de un intento anterior.
-- ============================================================================

create table if not exists public.rutinas_profesor (
  profesor_id uuid primary key references public.profesores (profile_id) on delete cascade,
  contenido text,
  archivo_url text, -- path en el bucket de Storage "rutinas" (creado a mano, ver nota arriba)
  archivo_nombre text, -- nombre original del archivo, para mostrarlo en el link de descarga
  updated_at timestamptz not null default now()
);

comment on table public.rutinas_profesor is
  'Una fila por profesor (se crea/actualiza con upsert por profesor_id) -- texto libre y/o archivo con la rutina que viene dando.';

drop trigger if exists trg_rutinas_profesor_updated_at on public.rutinas_profesor;
create trigger trg_rutinas_profesor_updated_at
  before update on public.rutinas_profesor
  for each row execute function public.fn_set_updated_at();

alter table public.rutinas_profesor enable row level security;

drop policy if exists "profesores y admin ven todas las rutinas" on public.rutinas_profesor;
create policy "profesores y admin ven todas las rutinas"
  on public.rutinas_profesor for select
  using (public.fn_current_role() in ('admin', 'profesor'));

drop policy if exists "profesor gestiona su propia rutina" on public.rutinas_profesor;
create policy "profesor gestiona su propia rutina"
  on public.rutinas_profesor for all
  using (profesor_id = auth.uid())
  with check (profesor_id = auth.uid());

drop policy if exists "admin gestiona cualquier rutina" on public.rutinas_profesor;
create policy "admin gestiona cualquier rutina"
  on public.rutinas_profesor for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

-- ---------------------------------------------------------------------------
-- Storage: políticas sobre storage.objects para el bucket "rutinas" -- mismo
-- criterio que "comprobantes" (migración 20260813170000): convención de path
-- <profesor_id>/<archivo>, restringido con storage.foldername(name). El
-- bucket en sí NO se crea acá (ver nota arriba) -- estas políticas quedan
-- inertes hasta que exista, y empiezan a regir solas apenas se lo crea a
-- mano con el nombre "rutinas".
-- ---------------------------------------------------------------------------
drop policy if exists "profesor sube su propia rutina" on storage.objects;
create policy "profesor sube su propia rutina"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'rutinas'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profesor actualiza su propia rutina" on storage.objects;
create policy "profesor actualiza su propia rutina"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'rutinas' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'rutinas' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profesor borra su propia rutina" on storage.objects;
create policy "profesor borra su propia rutina"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'rutinas' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profesores y admin ven archivos de rutinas" on storage.objects;
create policy "profesores y admin ven archivos de rutinas"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'rutinas' and public.fn_current_role() in ('admin', 'profesor'));
