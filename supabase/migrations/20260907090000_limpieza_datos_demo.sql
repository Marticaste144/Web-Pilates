-- ============================================================================
-- MUV Gimnasia Postural — Limpieza de datos demo/prueba antes del lanzamiento
-- PREPARADA, NO APLICADA.
--
-- CORREGIDA: el primer intento de aplicar esta migración falló con
--   ERROR: P0001: No tenés permiso para modificar ese campo de la alumna
--   CONTEXT: fn_restringir_columnas_alumno() line 11 at RAISE
-- Diagnóstico y fix real explicados en el bloque 0 de acá abajo -- NO se
-- deshabilitó ningún trigger para esquivar el error. El fix corrige un bug
-- real de la función (ya estaba afectando, sin que nadie lo hubiera notado
-- todavía, al flujo real de "Dar acceso a MUV" -- ver bloque 0), y de paso
-- deja pasar esta limpieza.
--
-- Alcance de la limpieza (bloque 1) verificado por inspección directa de la
-- base real antes de escribir esto (nunca a ciegas): se identifican por ID
-- exacto -- ninguna fila se toca por coincidencia de nombre/patrón.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) FIX REAL: fn_restringir_columnas_alumno() -- por qué falló y por qué
--    este cambio es seguro.
--
-- POR QUÉ FALLÓ:
--   La función permite tocar activo/email/profile_id/id solo cuando
--   fn_current_role() = 'admin'. fn_current_role() (definida en
--   20260810181246_auth_roles_rls.sql) resuelve el rol así:
--     select role from public.profiles where id = auth.uid()
--   auth.uid() sale del JWT de la request actual -- fuera de una conexión
--   de PostgREST con sesión real, auth.uid() es NULL. Una migración corre
--   como conexión directa a Postgres (rol de servicio/postgres), sin JWT
--   de ningún usuario -- así que fn_current_role() daba NULL (no 'admin'),
--   y la función rechazaba el UPDATE aunque quien lo corre tiene control
--   total de la base.
--
--   ESTO NO ES SOLO UN PROBLEMA DE ESTA MIGRACIÓN: el mismo mecanismo ya
--   estaba afectando en silencio al flujo real de "Dar acceso a MUV"
--   (lib/admin/alumnos-actions.ts, darAccesoAlumna). Ese flujo usa
--   admin.auth.admin.generateLink({type:'invite', ...}), que crea la fila
--   en auth.users con el cliente de service_role (sin sesión de usuario
--   real, mismo caso que una migración). Eso dispara fn_handle_new_user
--   (trigger sobre auth.users), que hace:
--     update public.alumnos set profile_id = new.id where id = v_alumno_id...
--   Ese UPDATE pasa por fn_restringir_columnas_alumno() igual que
--   cualquier otro -- y como auth.uid() también es NULL en ese momento (la
--   inserción en auth.users la originó el service_role, no una sesión),
--   HABRÍA FALLADO CON EL MISMO ERROR apenas alguien probara "Dar acceso a
--   MUV" por primera vez con una alumna real. Nunca se detectó antes
--   porque explícitamente no se probó ese flujo con datos reales todavía
--   (instrucción de los bloques anteriores: "NO enviar invitaciones
--   reales").
--
-- POR QUÉ ESTE FIX ES SEGURO (no debilita nada):
--   Se agrega una sola condición adicional: "auth.uid() is null" también
--   deja pasar el UPDATE, ANTES de evaluar fn_current_role(). Se analizaron
--   los únicos casos donde una fila de "alumnos" puede llegar a este
--   trigger con auth.uid() null:
--     a) Conexión directa de mantenimiento (migración, SQL editor con el
--        rol de servicio) -- ya tiene control total de la base; un trigger
--        de negocio no es ni puede ser una barrera real contra esto (con
--        ese nivel de acceso también se podría deshabilitar el trigger
--        mismo, o la base entera). No es el escenario que este trigger
--        existe para frenar.
--     b) Cascadas de triggers server-side como fn_handle_new_user,
--        disparadas por una inserción hecha con el cliente de service_role
--        -- ese cliente SOLO se usa dentro de Server Actions que ya
--        exigieron requireAdminProfile() antes de llamarlo (verificado:
--        lib/admin/alumnos-actions.ts, lib/admin/profesores-actions.ts).
--        Nunca es alcanzable por un request de un usuario común.
--   NINGÚN alumno o profesor real llega nunca a este trigger con auth.uid()
--   null: las policies de RLS de "alumnos" (admin gestiona alumnos /
--   profesor actualiza datos de alumnas sin cuenta) YA exigen un
--   auth.uid() real antes de que el UPDATE pase -- si no lo tienen, RLS
--   rechaza el UPDATE antes de llegar acá, este trigger ni se entera. Un
--   profesor autenticado normal sigue exactamente igual de restringido que
--   antes (fn_current_role() le sigue devolviendo 'profesor', no null, así
--   que sigue cayendo en el RAISE EXCEPTION de siempre si intenta tocar
--   esas columnas).
--
--   Se corrige la función en vez de deshabilitar el trigger (ni acá ni
--   temporalmente): el trigger sigue activo todo el tiempo, protegiendo lo
--   mismo que protegía, solo que ahora también reconoce como confiable el
--   mismo nivel de acceso que RLS y el resto del sistema ya confían.
-- ----------------------------------------------------------------------------
create or replace function public.fn_restringir_columnas_alumno()
returns trigger
language plpgsql
as $fn_restringir_columnas_alumno$
begin
  if auth.uid() is null or public.fn_current_role() = 'admin' then
    return new;
  end if;

  if new.activo is distinct from old.activo
     or new.email is distinct from old.email
     or new.profile_id is distinct from old.profile_id
     or new.id is distinct from old.id then
    raise exception 'No tenés permiso para modificar ese campo de la alumna';
  end if;

  return new;
end;
$fn_restringir_columnas_alumno$;

-- ----------------------------------------------------------------------------
-- 1) Limpieza de datos demo/prueba -- sin cambios respecto de la versión
--    anterior de esta migración: solo UPDATE activo=false por id exacto,
--    sin ningún DELETE, sin CASCADE, sin tocar Auth, sin tocar profesores
--    reales.
--
-- QUÉ NO HACE (a propósito):
--   - No borra ninguna fila -- todo el historial (inscripciones, pagos,
--     asistencias, planificaciones) queda intacto y consultable, solo deja
--     de aparecer en las vistas operativas de Admin/Profesor por default.
--   - No toca Auth (ningún DELETE/UPDATE sobre auth.users).
--   - No toca a Sabina, Laila, ni a ningún profesor real ni sus horarios.
--   - No toca profiles.role de nadie.
--
-- PROFESORES DEMO (Bruno Álvarez, Carla Medina): ya están con activo=false
-- en "profesores" y sus clases ya están con activa=false -- no necesitan
-- nada acá, confirmado antes de escribir esta migración.
-- ----------------------------------------------------------------------------

-- Alumnas demo con datos de prueba reales cargados en el sistema:
--   8cdd5760-6d13-43b9-97b8-886aef23a219 -- "Lucía Fernández"
--     (castellanimartina3+alumno1@gmail.com) -- 20 inscripciones, 5 pagos,
--     7 asistencias, 1 planificación de prueba.
--   a95ca145-940f-40b5-ab05-56050cc80631 -- "Martín Gómez"
--     (castellanimartina3+alumno2@gmail.com) -- 4 inscripciones, 2 pagos.
--   7124e401-6403-4981-b926-c9370de658f4 -- "Valentina Rossi"
--     (castellanimartina3+alumno3@gmail.com) -- sin relaciones (0 en todo).
update public.alumnos
set activo = false
where id in (
  '8cdd5760-6d13-43b9-97b8-886aef23a219',
  'a95ca145-940f-40b5-ab05-56050cc80631',
  '7124e401-6403-4981-b926-c9370de658f4'
);

-- Fila huérfana: la cuenta de administración/desarrollo (role='admin' en
-- profiles, no 'alumno') tiene además una fila propia en "alumnos" -- resto
-- de una prueba del flujo de autoregistro con la misma cuenta. Sin ninguna
-- relación (0 inscripciones/pagos/asistencias/fichas/planificaciones/
-- feedback, verificado antes de escribir esto).
--   ae11c481-4ccd-489c-a238-db504020ae41 -- profile_id = id de
--   castellanimartina3@gmail.com (role='admin').
update public.alumnos
set activo = false
where id = 'ae11c481-4ccd-489c-a238-db504020ae41';

-- ---------------------------------------------------------------------------
-- NO incluidas acá (a propósito, requieren tu confirmación -- ver informe):
--   829344d0-d19e-4d72-a972-cc3286868853 -- "JONATHAN SANTURIO" (elbusquii@gmail.com)
--   d3b0b9a6-9474-4ecc-a168-bdccdd26c746 -- "WALTER CASTELLANI" (waltercastellani@hotmail.com)
--   29bb126e-d746-4e21-8387-b6419e08d791 -- "Sofia núñez" (sifin@gmail.com)
-- No se inventa una regla de "es demo" para estas tres -- se dejan tal cual
-- hasta que confirmes si son reales o de prueba.
-- ============================================================================
