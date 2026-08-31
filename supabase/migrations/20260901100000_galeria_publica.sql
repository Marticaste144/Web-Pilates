-- ============================================================================
-- MUV Gimnasia Postural — Galería pública de fotos/videos de ejercicios
--
-- La landing es pública (sin sesión). Igual que con v_profesores_publicos
-- (migración 20260901090000), se expone el contenido a través de una vista
-- que corre con privilegios de postgres y filtra "publicado" en el WHERE --
-- así no hace falta abrir ninguna policy "anon" sobre la tabla base.
--
-- NOTA (mismo criterio que "rutinas"/"profesores"): el bucket "galeria" se
-- crea A MANO desde el dashboard (Storage > New bucket, público), NO acá --
-- el rol que corre el SQL Editor no es owner de storage.buckets. Ver
-- instrucciones en el PR/README. Acá solo van la tabla, la vista y las
-- policies de storage.objects.
-- ============================================================================

create type public.tipo_galeria_item as enum ('foto', 'video');

create table public.galeria_items (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_galeria_item not null,
  storage_path text not null, -- path en el bucket de Storage "galeria" (público, creado a mano)
  titulo text,
  orden int not null default 0,
  publicado boolean not null default true,
  subido_por uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.galeria_items is
  'Fotos/videos de ejemplo de ejercicios para la sección de galería de la landing pública. Sin contenido real todavía -- la landing muestra "Próximamente" mientras esta tabla esté vacía.';

create index idx_galeria_items_publicado on public.galeria_items (publicado, orden, created_at);

alter table public.galeria_items enable row level security;

create policy "admin gestiona galeria"
  on public.galeria_items for all
  using (public.fn_current_role() = 'admin')
  with check (public.fn_current_role() = 'admin');

create or replace view public.v_galeria_publica as
select id, tipo, storage_path, titulo
from public.galeria_items
where publicado = true
order by orden, created_at;

comment on view public.v_galeria_publica is
  'Solo los items publicados, en orden de exhibición -- lo único que necesita la landing pública.';

grant select on public.v_galeria_publica to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: políticas sobre storage.objects para el bucket "galeria" (creado
-- a mano, ver nota arriba). Bucket PÚBLICO: se sirve por URL pública directa
-- (getPublicUrl), sin necesidad de política de lectura -- solo hace falta
-- restringir quién puede subir/borrar. Sin convención de subcarpeta por
-- usuario (a diferencia de "rutinas"/"profesores"): solo la admin escribe acá.
-- ---------------------------------------------------------------------------
drop policy if exists "admin gestiona archivos de galeria" on storage.objects;
create policy "admin gestiona archivos de galeria"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'galeria' and public.fn_current_role() = 'admin')
  with check (bucket_id = 'galeria' and public.fn_current_role() = 'admin');
