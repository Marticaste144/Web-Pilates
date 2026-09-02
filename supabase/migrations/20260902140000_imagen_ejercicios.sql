-- ============================================================================
-- MUV Gimnasia Postural — Imagen ilustrativa por ejercicio (BLOQUE VISUAL, Tarea 2)
--
-- Mismo patrón que profesores.foto_url (migración 20260901090000): la
-- columna guarda un PATH dentro de un bucket de Storage público, no una URL
-- -- el front arma la URL pública con getPublicUrl (sin request de red).
--
-- Todavía no sabemos qué ejercicio corresponde a cada una de las 4 fotos
-- subidas a /public (ejerciciofoto.jpeg..4.jpeg) -- esta migración NO asigna
-- ninguna, solo prepara la columna/bucket para que se puedan subir imágenes
-- reales por ejercicio desde la UI cuando se sepa cuál va con cuál.
--
-- NOTA (mismo criterio que "profesores"/"galeria"/"rutinas"): el bucket
-- "ejercicios" se crea A MANO desde el dashboard (Storage > New bucket,
-- público), NO acá -- el rol que corre el SQL Editor no es owner de
-- storage.buckets. Acá solo van la columna y las policies de storage.objects.
-- ============================================================================

alter table public.planificacion_ejercicios add column if not exists imagen_url text;

comment on column public.planificacion_ejercicios.imagen_url is
  'Path en el bucket de Storage "ejercicios" (público, creado a mano -- ver nota arriba). Null = sin imagen, el front muestra la card sin miniatura.';

-- ---------------------------------------------------------------------------
-- Storage: convención de path "<ejercicio_id>/imagen.<ext>", igual que
-- "profesores"/"<profesor_id>/foto.<ext>". A diferencia de "profesores" (que
-- autoriza por auth.uid() = carpeta), acá se reutiliza la MISMA autorización
-- que ya protege la fila del ejercicio (fn_planificacion_autorizada, con
-- p_requiere_actual=true -- ver migración 20260902090000_planificaciones.sql):
-- solo puede subir/reemplazar/borrar la imagen quien ya podía editar ESE
-- ejercicio puntual (profesor dueño de la planificación individual/grupal,
-- sobre su versión actual). Un suplente, que solo tiene SELECT sobre
-- planificaciones (migración 20260902130000), no matchea acá tampoco.
-- ---------------------------------------------------------------------------
drop policy if exists "sube imagen de ejercicio autorizado" on storage.objects;
create policy "sube imagen de ejercicio autorizado"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ejercicios'
    and exists (
      select 1 from public.planificacion_ejercicios pe
      where pe.id::text = (storage.foldername(name))[1]
        and public.fn_planificacion_autorizada(pe.planificacion_id, true)
    )
  );

drop policy if exists "reemplaza imagen de ejercicio autorizado" on storage.objects;
create policy "reemplaza imagen de ejercicio autorizado"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'ejercicios'
    and exists (
      select 1 from public.planificacion_ejercicios pe
      where pe.id::text = (storage.foldername(name))[1]
        and public.fn_planificacion_autorizada(pe.planificacion_id, true)
    )
  )
  with check (
    bucket_id = 'ejercicios'
    and exists (
      select 1 from public.planificacion_ejercicios pe
      where pe.id::text = (storage.foldername(name))[1]
        and public.fn_planificacion_autorizada(pe.planificacion_id, true)
    )
  );

drop policy if exists "borra imagen de ejercicio autorizado" on storage.objects;
create policy "borra imagen de ejercicio autorizado"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'ejercicios'
    and exists (
      select 1 from public.planificacion_ejercicios pe
      where pe.id::text = (storage.foldername(name))[1]
        and public.fn_planificacion_autorizada(pe.planificacion_id, true)
    )
  );

drop policy if exists "admin gestiona imagenes de ejercicios" on storage.objects;
create policy "admin gestiona imagenes de ejercicios"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'ejercicios' and public.fn_current_role() = 'admin')
  with check (bucket_id = 'ejercicios' and public.fn_current_role() = 'admin');
