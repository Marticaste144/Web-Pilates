-- ============================================================================
-- MUV Gimnasia Postural — Fix real de "la carga de Excel sigue fallando"
--
-- CAUSA RAÍZ (reproducida en vivo subiendo un .xlsx genuino, no una hipótesis):
-- la policy de INSERT sobre storage.objects para "planificaciones-excel"
-- (20260905090000_planificaciones_excel.sql) exige
-- fn_autoriza_archivo_planificacion(planificacion_id) -- función que busca
-- una fila YA EXISTENTE en "planificaciones" con ese id. Pero
-- lib/planificaciones-excel-actions.ts SIEMPRE sube el archivo a Storage
-- ANTES de crear esa fila (a propósito, según su propio comentario: "si algo
-- falla en el medio, no queda una fila 'excel' sin archivo real detrás").
-- Resultado: la fila NUNCA existe todavía en el momento del upload, así que
-- fn_autoriza_archivo_planificacion siempre devuelve false y CUALQUIER carga
-- de Excel (primera versión o nueva versión) fallaba siempre con "new row
-- violates row-level security policy" -- sin importar qué tan válido fuera
-- el archivo. No era un problema de validación de archivo (aunque también
-- había uno real, ya corregido en el código: una whitelist de file.type
-- demasiado angosta) -- era este.
--
-- FIX: el INSERT a storage.objects de este bucket deja de depender de que
-- la fila ya exista (es imposible en el momento de subir, por diseño). Pasa
-- a alcanzar con que quien sube sea profesor o admin -- la autorización REAL
-- (quién puede LEER el archivo después, y quién puede crear la fila de
-- "planificaciones" que le da sentido a ese path) sigue intacta y sin
-- cambios: el SELECT de este mismo bucket sigue exigiendo
-- fn_autoriza_archivo_planificacion tal cual, y la tabla "planificaciones"
-- sigue exigiendo su propia autorización real (fn_profesor_autoriza_alumno_
-- planificacion / fn_profesor_autoriza_clase_planificacion) para poder
-- insertar la fila que referencia ese archivo. Un archivo subido sin que
-- después se cree la fila correspondiente (ej. el insert de la fila falla
-- justo después) queda huérfano e ilegible por nadie -- mismo riesgo que el
-- propio código ya documenta y acepta para ese caso.
-- ============================================================================

drop policy if exists "profesor autorizado sube archivo de planificacion" on storage.objects;
create policy "profesor autorizado sube archivo de planificacion"
  on storage.objects for insert
  with check (
    bucket_id = 'planificaciones-excel'
    and public.fn_current_role() in ('profesor', 'admin')
  );
