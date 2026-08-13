-- ============================================================================
-- MUV Gimnasia Postural — Storage: comprobantes de pago (paso 12)
-- Bucket privado (no público -- los comprobantes son datos personales/
-- financieros) donde el alumno sube una imagen o PDF como respaldo de un
-- pago hecho fuera del sistema (efectivo, transferencia, etc.). La admin
-- necesita poder verlo; nadie más.
--
-- Convención de path: comprobantes/<alumno_id>/<pago_id>.<ext> -- permite
-- restringir por RLS con storage.foldername(name), sin tener que guardar
-- ninguna tabla intermedia de permisos.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comprobantes',
  'comprobantes',
  false,
  10485760, -- 10 MiB, de sobra para una foto de un ticket o un PDF corto
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

create policy "alumno sube su propio comprobante"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "alumno ve su propio comprobante"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "admin ve todos los comprobantes"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'comprobantes'
    and public.fn_current_role() = 'admin'
  );
