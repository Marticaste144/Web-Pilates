-- ============================================================================
-- MUV Gimnasia Postural — Foto de profesor + sección pública de profesores
--
-- Agrega foto_url (path en el bucket de Storage "profesores") a la tabla
-- profesores, con fallback a un placeholder en el front si está vacío. La
-- landing es pública (sin sesión), así que se expone SOLO nombre/apellido/
-- foto de profesores activos a través de una vista (v_profesores_publicos)
-- en vez de abrir una policy "anon" directa sobre profiles/profesores --
-- mismo criterio que ya usa v_estado_cuota_alumno_sede: la vista corre con
-- los privilegios de su dueña (postgres) y filtra en el WHERE, así que ni
-- hace falta un GRANT a anon sobre las tablas base.
--
-- NOTA (mismo criterio que la migración de rutinas): el bucket "profesores"
-- se crea A MANO desde el dashboard (Storage > New bucket), NO acá -- el rol
-- que corre el SQL Editor no es owner de storage.buckets. Ver instrucciones
-- en el PR/README. Acá solo van la columna, la vista y las policies de
-- storage.objects.
-- ============================================================================

alter table public.profesores add column if not exists foto_url text;

comment on column public.profesores.foto_url is
  'Path en el bucket de Storage "profesores" (bucket público, creado a mano -- ver nota arriba). Si es null, el front usa un placeholder tipo carnet.';

create or replace view public.v_profesores_publicos as
select p.id, p.nombre, p.apellido, pr.foto_url
from public.profiles p
join public.profesores pr on pr.profile_id = p.id
where p.role = 'profesor' and pr.activo = true
order by p.apellido, p.nombre;

comment on view public.v_profesores_publicos is
  'Solo nombre/apellido/foto de profesores activos -- lo único que necesita la landing pública. Filtra "activo" en el WHERE porque corre con privilegios de postgres (bypassa RLS).';

grant select on public.v_profesores_publicos to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: políticas sobre storage.objects para el bucket "profesores"
-- (creado a mano, ver nota arriba) -- convención de path
-- <profesor_id>/<archivo>, igual que "rutinas"/"comprobantes". Bucket
-- PÚBLICO (a diferencia de esos dos): la foto se sirve directo por URL
-- pública, sin necesidad de política de lectura -- solo se necesita
-- restringir quién puede subir/reemplazar/borrar.
-- ---------------------------------------------------------------------------
drop policy if exists "profesor sube su propia foto" on storage.objects;
create policy "profesor sube su propia foto"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profesores'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profesor actualiza su propia foto" on storage.objects;
create policy "profesor actualiza su propia foto"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'profesores' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'profesores' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "admin gestiona fotos de profesores" on storage.objects;
create policy "admin gestiona fotos de profesores"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'profesores' and public.fn_current_role() = 'admin')
  with check (bucket_id = 'profesores' and public.fn_current_role() = 'admin');
