-- ============================================================================
-- MUV Gimnasia Postural — Planificaciones en Excel (arquitectura propuesta,
-- NO ejecutada -- ver AUDITORÍA GENERAL, sección Excel)
--
-- REVISADA (bloque de cierre, identidad de alumnas desacoplada de Auth --
-- ver 20260906090000_identidad_alumnas.sql): esta migración es POSTERIOR a
-- esa y depende de que se aplique primero. Se corrigió el único punto que
-- rompía con el nuevo modelo: fn_autoriza_archivo_planificacion comparaba
-- "p.alumno_id = auth.uid()" para "la alumna consultando la suya" -- eso ya
-- era inconsistente incluso antes de la identidad desacoplada, porque la
-- tabla "planificaciones" NUNCA tuvo una policy de "alumno ve su propia
-- planificación" (ver 20260902090000_planificaciones.sql: no existe esa
-- policy, solo admin/profesor) -- le daría acceso al ARCHIVO sin que la
-- alumna pudiera siquiera leer la FILA que dice dónde está. Se saca esa
-- rama entera en vez de solo actualizarla a fn_alumno_id_actual(): "no
-- asumas que el alumno puede ver la planificación salvo que el sistema
-- actual/regla confirmada lo diga" -- hoy no lo dice, así que no se inventa
-- el acceso acá. Si en el futuro se confirma y se agrega esa policy sobre
-- "planificaciones", ESTA función deberá volver a extenderse recién ahí.
--
-- CONTEXTO: el sistema estructurado de planificaciones (planificaciones +
-- planificacion_dias/bloques/ejercicios/ejercicio_semanas, migración
-- 20260902090000) ya modela correctamente lo esencial del negocio real:
--   - individual pertenece al ALUMNO, grupal pertenece a la CLASE
--     (chk_planificacion_owner, alumno_id XOR clase_id);
--   - versionado real: es_actual=true es la vigente, el resto es historial
--     de solo lectura (uq_planificacion_actual_alumno/clase, políticas de
--     UPDATE que exigen es_actual=true);
--   - autorización SERVER-SIDE ya resuelta (fn_profesor_autoriza_alumno_
--     planificacion / fn_profesor_autoriza_clase_planificacion) -- un
--     profesor no puede tocar la planificación de un alumno/clase ajena
--     cambiando una URL, está reforzado en RLS, no solo en el front.
--
-- DECISIÓN DE ARQUITECTURA: un profesor de MUV pidió poder seguir
-- trabajando su rutina en Excel en vez de cargar día/bloque/ejercicio/
-- semana a mano en el formulario estructurado. En vez de crear un sistema
-- paralelo (tabla nueva con su propio dueño/versión/RLS desde cero, con el
-- riesgo de divergir del ya existente), se EXTIENDE la misma tabla
-- "planificaciones" con un "formato" -- structurada (como hasta ahora) o
-- excel (un archivo subido). Motivo: así una fila de planificaciones
-- SIGUE siendo la misma unidad de versión/dueño/autorización de siempre,
-- sin duplicar RLS ni funciones -- reutiliza el 100% del sistema ya
-- probado. Cuando formato='excel', las tablas hijas
-- (dias/bloques/ejercicios/semanas) simplemente no se usan para esa fila
-- (quedan vacías) -- no se tocan ni se migran datos existentes.
--
-- NO SE EJECUTA ACÁ (falta confirmar antes de aplicar):
--   - el bucket "planificaciones-excel" (privado) se crea A MANO desde el
--     dashboard de Storage, igual que "comprobantes"/"rutinas" -- el rol
--     que corre las migraciones no es owner de storage.buckets (mismo
--     comentario que otras migraciones de Storage de este proyecto).
--   - esta migración en sí (agrega columnas + políticas de storage.objects)
--     queda preparada pero sin aplicar, como el resto del bloque.
-- ============================================================================

alter table public.planificaciones
  add column formato text not null default 'estructurada'
    check (formato in ('estructurada', 'excel')),
  add column archivo_storage_path text,
  add column archivo_nombre_original text,
  add constraint chk_planificacion_excel check (
    (formato = 'estructurada' and archivo_storage_path is null)
    or (formato = 'excel' and archivo_storage_path is not null and archivo_nombre_original is not null)
  );

comment on column public.planificaciones.formato is
  '"estructurada" (default, como hasta ahora: días/bloques/ejercicios/semanas propios de MUV) o "excel" (un archivo .xlsx subido por el profesor, que se visualiza dentro de MUV -- ver lib/planificaciones-excel.ts). Nunca las dos cosas en la misma fila/versión.';
comment on column public.planificaciones.archivo_storage_path is
  'Path en el bucket privado "planificaciones-excel" (convención: "<planificacion_id>/<archivo>", igual que "comprobantes") -- null si formato=estructurada.';
comment on column public.planificaciones.archivo_nombre_original is
  'Nombre del archivo tal como lo subió el profesor (para "Descargar Excel original" y para mostrarlo en el historial de versiones) -- null si formato=estructurada.';

-- ---------------------------------------------------------------------------
-- Storage: mismo criterio que "comprobantes" (bucket privado, RLS por
-- storage.foldername(name)) -- acá el primer segmento del path es el id de
-- la fila de planificaciones (uuid), así que en vez de comparar contra
-- auth.uid() se reutilizan las MISMAS funciones de autorización que ya
-- protegen la tabla "planificaciones" (nunca se duplica la regla).
-- ---------------------------------------------------------------------------
create or replace function public.fn_autoriza_archivo_planificacion(p_planificacion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn_autoriza_archivo_planificacion$
  select exists (
    select 1 from public.planificaciones p
    where p.id = p_planificacion_id
      and (
        public.fn_current_role() = 'admin'
        or (p.tipo = 'individual' and public.fn_profesor_autoriza_alumno_planificacion(p.alumno_id))
        or (p.tipo = 'grupal' and public.fn_profesor_autoriza_clase_planificacion(p.clase_id))
      )
  );
$fn_autoriza_archivo_planificacion$;

drop policy if exists "acceso a archivos de planificacion segun autorizacion" on storage.objects;
create policy "acceso a archivos de planificacion segun autorizacion"
  on storage.objects for select
  using (
    bucket_id = 'planificaciones-excel'
    and public.fn_autoriza_archivo_planificacion(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "profesor autorizado sube archivo de planificacion" on storage.objects;
create policy "profesor autorizado sube archivo de planificacion"
  on storage.objects for insert
  with check (
    bucket_id = 'planificaciones-excel'
    and public.fn_autoriza_archivo_planificacion(((storage.foldername(name))[1])::uuid)
  );

comment on function public.fn_autoriza_archivo_planificacion(uuid) is
  'Reutiliza fn_profesor_autoriza_alumno_planificacion/fn_profesor_autoriza_clase_planificacion (mismas que ya protegen la tabla planificaciones) para decidir quién puede leer/subir el archivo de esa versión -- nunca una regla nueva y separada.';
