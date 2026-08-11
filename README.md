# MUV Gimnasia Postural

Plataforma web para la gestión de MUV Gimnasia Postural (3 sedes: MUV FITNESS,
MUV POSTURAL, MUV PILATES) — inscripciones, cuotas, asistencia y avisos, con
3 roles: admin, profesor y alumno.

**Stack:** Next.js (App Router) + TypeScript · Supabase (Postgres + Auth + Storage)
· Tailwind CSS · Mercado Pago (Checkout Pro) · PWA.

## Etapas del proyecto

1. ✅ Estructura inicial + configuración de Supabase
2. ✅ Modelo de datos (Sede, Profesor, Alumno, Clase, Inscripción, Pago, Asistencia, Aviso)
3. ✅ Autenticación con 3 roles y protección de rutas
4. ✅ Pantalla de login (web y mobile)
5. 🔶 Pantallas funcionales por rol -- en curso: 5a Admin ✅ · 5b Alumno ✅ · 5c Profesor (clases y asistencia) ✅

## Setup

### 1. Crear el proyecto en Supabase

1. Andá a [supabase.com](https://supabase.com) y creá un proyecto nuevo.
2. En **Project Settings > API** copiá:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (nunca se expone al cliente)

### 2. Variables de entorno

```bash
cp .env.local.example .env.local
```

Completá `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
`SUPABASE_SERVICE_ROLE_KEY`. Las variables de Mercado Pago y Web Push todavía
no hacen falta — se usan en etapas posteriores.

### 3. Instalar dependencias y correr en local

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). Para confirmar que la
conexión a Supabase funciona, visitá
[http://localhost:3000/api/health](http://localhost:3000/api/health) — debería
devolver `{ "ok": true }`.

### 4. Aplicar el modelo de datos (paso 2)

La migración con todas las tablas está en `supabase/migrations/`. Para
aplicarla al proyecto de Supabase que creaste:

```bash
npx supabase login
npx supabase link --project-ref <tu-project-ref>   # está en la URL del dashboard
npx supabase db push
```

Esto crea las tablas, los triggers de validación y las políticas de RLS
mínimas. Después, para tener los tipos de TypeScript generados 1:1 desde la
base real (los actuales en `types/database.ts` están escritos a mano):

```bash
npx supabase gen types typescript --linked > types/database.ts
```

## Estructura del proyecto

```
app/                    rutas (App Router)
  api/health/            endpoint de chequeo de conexión a Supabase
  login/, signup/        auth (formularios sin estilo -- diseño real: paso 4)
  admin/, profesor/, alumno/  áreas protegidas por rol (layout.tsx = guardia de rol)
lib/supabase/
  client.ts              cliente de Supabase para Client Components
  server.ts              cliente de Supabase para Server Components / Server Actions
  middleware.ts          helper para refrescar la sesión en cada request
lib/auth/
  session.ts             getCurrentProfile() / requireRole() para Server Components
  actions.ts             Server Actions: signIn, signUpAlumno, signOut
components/role-shell.tsx  header mínimo (nombre + cerrar sesión) para las áreas por rol
proxy.ts                 proxy de Next.js 16 (ex-middleware); corta en el edge sin sesión
supabase/migrations/     migraciones SQL (esquema, triggers, RLS) -- se aplican en orden
types/database.ts        tipos de la base (idealmente regenerados con `supabase gen types`)
public/manifest.json     manifest de la PWA (iconos placeholder por ahora)
```

## Modelo de datos (paso 2)

Ver `supabase/migrations/20260810173955_initial_schema.sql` para el detalle
completo. Resumen de las tablas y decisiones de diseño:

- **`sedes`** — MUV FITNESS / POSTURAL / PILATES.
- **`profiles`** — 1 fila por usuario autenticado (id = `auth.users.id`),
  con el `role` (admin/profesor/alumno) y datos personales. Se crea sola vía
  trigger cuando alguien se registra en Supabase Auth.
- **`profesores`** / **`alumnos`** — tablas de extensión de `profiles`
  (1:1), para que las foreign keys de `clases` e `inscripciones` solo puedan
  apuntar a un perfil del rol correcto.
- **`aranceles`** — precio por sede + clases/semana, versionado por
  `vigente_desde` (un aumento agrega una fila nueva, no pisa el historial).
  Placeholder con los valores que me pasaste; la admin va a poder editarlos
  desde el paso 5.
- **`clases`** — la plantilla fija (sede + día + horario + profesor + cupo).
  Un profesor puede tener clases en varias sedes.
- **`inscripciones`** — alumno + clase + estado (`activa` / `lista_espera` /
  `baja`), con `posicion_espera` para el FIFO.
- **`pagos`** — un intento de cobro por fila (se conserva el historial
  completo, no se pisan los rechazados), con `medio`, `estado`, comprobante y
  quién/cuándo lo marcó manualmente. `aprobado_en`/`vencimiento` no los carga
  nadie a mano: un trigger los calcula solo al aprobarse el pago, con ciclo
  rodante (`vencimiento = aprobado_en + 1 mes`, no un día fijo del
  calendario) — si el alumno paga tarde, el próximo vencimiento también se
  corre. Cualquier valor que se intente cargar ahí se ignora y se recalcula.
- **`pagos_auditoria`** — log de cambios de estado de pago (pedido explícito
  para pagos marcados a mano).
- **`asistencias`** — una fila por clase + alumno + fecha de esa sesión
  semanal puntual.
- **`avisos`** / **`avisos_sedes`** — con `todas_las_sedes` o segmentado a
  sedes puntuales.
- **Vista `v_estado_cuota_alumno_sede`** — última cuota aprobada por
  alumno+sede, con el estado visual (`al_dia` / `por_vencer` / `vencida`)
  calculado. Si un alumno no aparece ahí, nunca pagó.

**Reglas de negocio ya garantizadas por triggers a nivel de base** (no solo
en la UI, así que ningún código ni error humano las puede saltear):
sin superposición de horario entre clases activas del alumno (aunque sean de
sedes distintas), máximo 4 clases activas por semana por sede, y el cupo de
una clase nunca puede tener más `activa` que su `cupo`. Validé las tres con
datos de prueba reales antes de dejarlas commiteadas.

**Supuestos que tomé porque no estaban definidos:** el día de vencimiento de
la cuota queda como un campo explícito por pago (no se infiere del período)
porque no se definió el día de corte del ciclo de facturación; "próxima a
vencer" en la vista usa el umbral de 5 días que mencionaste en la sección 7.
Avisame si alguno de estos dos hay que ajustarlo.

## Autenticación y RLS por rol (paso 3)

### Aplicar la migración

Es incremental: NO recrea nada del paso 2, solo agrega funciones, triggers,
políticas de RLS y grants nuevos. Mismo procedimiento que la vez pasada
-- SQL Editor del dashboard de Supabase, pegar el contenido completo de
`supabase/migrations/20260810181246_auth_roles_rls.sql` y **Run**. Se puede
correr una sola vez (si la corrés dos veces vas a tener errores de "ya
existe", no rompe nada pero no hace falta).

### Crear la primera cuenta admin

No hay pantalla de alta de admin a propósito (no tendría sentido que
cualquiera pueda crearse una cuenta de dueña).

**Si tu dashboard tiene un campo de "User Metadata" al crear el usuario**
(Authentication → Users → Add user), completalo con:
```json
{ "role": "admin", "nombre": "Tu nombre", "apellido": "Tu apellido" }
```
y listo: el trigger `fn_handle_new_user` (paso 2) crea sola la fila en
`profiles` con `role = admin`.

**Si tu dashboard NO tiene ese campo** (pasó al probarlo: algunas versiones
del diálogo "Add user" no lo muestran), el flujo alternativo es:

1. Creá el usuario desde **Add user** con email/contraseña nomás (sin
   metadata). El trigger igual crea el perfil, pero con `role = 'alumno'`
   por default.
2. **No** intentes cambiar el rol desde el Table Editor tal cual: el
   trigger `trg_restringir_columnas_profile` (paso 3) va a rechazar el
   cambio porque, en ese momento, todavía no sos admin -- necesitás ser
   admin para poder volverte admin. Para este único caso (el primer admin
   de un proyecto nuevo) hay que saltear el trigger a mano, en el SQL
   Editor:
   ```sql
   alter table public.profiles disable trigger trg_restringir_columnas_profile;
   update public.profiles set role = 'admin' where email = 'tu-email@ejemplo.com';
   alter table public.profiles enable trigger trg_restringir_columnas_profile;
   ```
3. Con eso ya podés entrar por `/login`.

Este segundo camino es solo para arrancar un proyecto nuevo desde cero.
Una vez que existe al menos un admin, esa persona puede promover a otros
admins (o crear profesores) desde el panel normalmente, sin tocar el SQL
Editor -- esa pantalla es del paso 5.

Profesores los crea la propia admin desde el panel — esa pantalla es del
paso 5. Las alumnas se registran solas desde `/signup`.

### Qué quedó armado

**Del lado de Next.js:**
- `/login`, `/signup` (autoregistro, rol `alumno` fijo) y `signOut` --
  formularios sin estilo todavía, funcionales; el diseño real es el paso 4.
- `/admin`, `/profesor`, `/alumno`: cada uno protegido por su propio
  `layout.tsx` (`lib/auth/session.ts` → `requireRole()`), que redirige a
  `/login` si no hay sesión, o al home del rol correcto si entrás a la
  sección que no te corresponde.
- `proxy.ts` corta en el edge el acceso sin sesión a esas tres rutas, antes
  de que se llegue a renderizar nada.

**Del lado de la base (políticas de RLS, antes todo estaba deny-by-default):**
- **admin**: acceso total a todo.
- **profesor**: ve sus propias clases/asistencias, y de un alumno solo ve su
  perfil/datos si (a) el alumno está anotado en una de sus clases Y (b) ya
  tuvo alguna cuota aprobada -- la regla de "invisible hasta la primera
  cuota" que definiste, aplicada en RLS, no solo en la UI. Puede editar
  datos personales de esos alumnos, pero un trigger (`fn_restringir_columnas_profile`)
  bloquea que toque `role` o `email` aunque lo intente por fuera de la
  pantalla. **No tiene acceso directo a la tabla `pagos`** (ni con API,
  aunque alguien se saltee la UI) -- ve el estado de cuota solo a través de
  la vista `v_estado_cuota_alumno_sede`, que expone únicamente
  vencimiento/estado/monto, no comprobante ni medio de pago.
- **alumno**: ve y edita solo lo suyo. Puede crear un intento de pago
  (`estado = 'pendiente'`) pero no puede autoaprobárselo -- eso es solo de
  la admin o del webhook de Mercado Pago (paso siguiente).
- Sin sesión (`anon`): cero acceso a cualquier tabla. Toda la app vive
  detrás de login, como corresponde a los 3 roles "login propio" del doc.

**Reglas de negocio que sumé como triggers** (mismo criterio que el paso 2 --
invariantes duras, no solo validación de UI), porque las respuestas de esta
conversación las dejaron 100% definidas:
- Un aviso activo bloquea anotarse, darse de baja y tomar asistencia en las
  clases de la sede afectada, ese día -- "nada", tal cual lo pediste. La
  admin queda exenta (puede seguir gestionando manualmente).
- Cuota vencida en la sede → no se puede marcar **presente** (ausente sí se
  puede) y no se puede anotar a **nuevas** clases (la primera inscripción,
  antes de la primera cuota, sí se permite).
- `pagos_auditoria` ahora se completa sola vía trigger en cada cambio de
  estado de un pago -- antes existía la tabla pero nada la llenaba.

Probé toda esta matriz (no solo la escribí) contra un Postgres local
simulando los roles `anon`/`authenticated`/`service_role` de Supabase:
admin viendo todo, profesor viendo solo alumnas visibles/suyas, alumna sin
ver a otras alumnas, intento de autoaprobación de pago rechazado, edición
cruzada entre profesores bloqueada, aviso bloqueando inscripción/asistencia,
cuota vencida bloqueando "presente" pero no "ausente", y `anon` sin acceso a
nada.

### Lo que falta a propósito para el paso 5

Crear profesores desde el panel de admin, el flujo de inscripción con
mensajes lindos (cupo lleno → lista de espera, aviso activo → cartel
explicando por qué), el webhook de Mercado Pago que aprueba pagos, y todas
las pantallas reales (`/admin`, `/profesor`, `/alumno` siguen siendo un
placeholder de una línea).

## Diseño del login (paso 4)

Implementado en `components/auth/` (`auth-hero.tsx` con las dos ondas SVG,
mobile y desktop, y `auth-shell.tsx` con el layout responsive) y reutilizado
en las 4 pantallas de auth: `/login`, `/signup`, `/forgot-password` y
`/reset-password` -- mismo lenguaje visual en las cuatro, aunque solo el
login tenía mockup de referencia.

- **Mobile** (`< md`): ola a pantalla completa arriba (~38% de la altura) +
  tarjeta blanca con el borde superior redondeado montada encima.
- **Desktop** (`≥ md`): fondo oscuro de página, panel dividido centrado con
  esquinas redondeadas -- ola a la izquierda con el nombre de la marca y
  texto de bienvenida, tarjeta flotante a la derecha con el formulario.
  "Recordarme" solo aparece en desktop (así estaba en el mockup); por ahora
  es visual, no cambia la duración de la sesión.
- El botón circular al lado de "Contraseña" es un toggle real de
  mostrar/ocultar, no solo decorativo.
- Los colores (`#2f7cd6` → `#2bbfa6`) son los mismos que ya se habían
  definido para el ícono/manifest de la PWA en el paso 1.

**Un agregado que no estaba explícitamente pedido pero hacía falta:** el
link "¿Olvidaste tu contraseña?" del mockup apuntaba a algo que no existía.
Armé el flujo completo de recuperación (`/forgot-password` pide el mail,
Supabase manda un link, `/auth/confirm` intercambia el código por una
sesión real -- si no se hace ese paso, `/reset-password` no tiene con qué
autenticar el cambio -- y `/reset-password` guarda la contraseña nueva),
para no dejar un botón que no lleva a ningún lado.

Validé ambas vistas (mobile 390px y desktop 1440px) sacando capturas reales
con Playwright antes de darlas por terminadas -- así encontré y corregí dos
bugs: los IDs de gradiente SVG se pisaban entre sí (por eso el fondo
aparecía negro en desktop) y el campo "Apellido" del signup se salía de la
pantalla en mobile por un `min-width` de flexbox.

## Paso 5a: Admin -- sedes, profesores, clases, aranceles

Sedes y aranceles placeholder (sección 5) se siembran solos vía
`supabase/migrations/20260810225434_seed_sedes_aranceles.sql` (idempotente:
se puede correr más de una vez sin duplicar) -- no hay pantalla para
"crear sedes" porque las 3 son fijas y el doc no pide poder agregar más.

- **`/admin/profesores`** -- invitar por email (crea el usuario vía
  `auth.admin.inviteUserByEmail`, que dispara el mismo trigger del paso 2 y
  le manda un mail para que fije su propia contraseña), editar datos, y
  activar/desactivar. "Eliminar" en el doc lo implementé como desactivar,
  no un DELETE real: `clases.profesor_id` tiene `on delete restrict`, así
  que borrar a alguien que ya dictó una clase directamente fallaría, y aun
  si no fallara se perdería a quién estaba asignada esa clase
  históricamente.
- **`/admin/clases`** -- asignar sede + profesor/a + día + horario + cupo.
  "Eliminar" clase también es desactivar (`activa=false`), no DELETE: la
  fila tiene `on delete cascade` hacia inscripciones/asistencias, así que
  borrarla de verdad se llevaría puesto el historial de esa clase.
- **`/admin/aranceles`** -- grilla sede × frecuencia editable. Cada guardado
  es un upsert con `vigente_desde = hoy`: no pisa el precio anterior, pero
  tampoco genera una fila nueva por cada click si editás el mismo valor dos
  veces el mismo día (usa el índice único de aranceles como conflict key).

**Encontré y corregí tres bugs reales antes de terminar:**
1. `types/database.ts` (escrito a mano) le faltaba la propiedad
   `Relationships` que `@supabase/postgrest-js` exige para poder inferir
   los tipos -- sin eso, cualquier `.select()`/`.insert()`/`.update()`
   colapsaba a `never` en tiempo de compilación. Lo detecté con `tsc`, no
   hizo falta descubrirlo en producción.
2. Un Client Component (`clase-form.tsx`) importaba una constante desde un
   archivo que a su vez importa `next/headers` -- rompía el build entero.
   Lo separé a `lib/admin/dias-semana.ts`, sin dependencias de servidor.
3. **El más importante:** `auth.admin.inviteUserByEmail` (para invitar
   profesores) no soporta el flujo PKCE que usa `/auth/confirm` -- está
   documentado así en el propio código de supabase-js, porque el
   navegador que manda la invitación nunca es el mismo que la acepta. El
   link de invitación llega con los tokens en el hash de la URL
   (`#access_token=...`), que **solo el navegador puede leer, nunca el
   servidor**. Armé `/auth/callback` (Client Component) específicamente
   para esto -- si hubiera reusado `/auth/confirm` a ciegas, invitar a un
   profesor se habría roto en el primer intento real.

**Verificación:** no tengo credenciales reales de Supabase en este entorno,
así que no pude probar el flujo completo en el navegador (a diferencia del
login del paso 4, estas pantallas si o si necesitan responder de la base).
Lo que sí hice: validé cada operación SQL exacta que usan las Server
Actions (insert de clase, upsert de arancel con su conflict key, toggles de
activo/activa) contra Postgres local con los mismos nombres de columnas y
constraints de la migración real, y confirmé con `tsc`/`build`/lint que
todo compila. **Lo que falta que pruebes vos:** invitar un profesor de
verdad y confirmar que el mail llega y el link funciona (Supabase da un
servicio de mail compartido con límite bajo para probar; para producción
hay que configurar SMTP propio en Authentication → Email Templates), crear
una clase y verificarla en el Table Editor, y editar un arancel.

## Paso 5b: Alumno -- inscripción y estado de cuota

Elegí seguir con esta sub-etapa antes que "profesor: asistencia" a
propósito: el profesor necesita alumnos ya inscriptos en sus clases para
que una pantalla de asistencia tenga sentido, así que primero tiene que
existir el flujo de inscripción.

Migración nueva: `supabase/migrations/20260810233847_cupo_clases_view.sql`.

- **`/alumno/clases`** -- lista las clases activas agrupadas por sede, con
  cupo ocupado/total y un botón "Anotarme". La app decide activa vs. lista
  de espera (mira `v_cupo_clases`), pero los invariantes duros los sigue
  garantizando la base con los triggers del paso 2/3: sin superposición de
  horario, máximo 4 clases/semana por sede, sin poder anotarse a algo
  nuevo con la cuota vencida en esa sede, y un aviso activo bloqueando la
  sede ese día -- si alguno de estos falla, el mensaje del trigger (ya en
  español) se le muestra directo al alumno.
- **`/alumno/inscripciones`** -- lo mío: activas y en lista de espera (con
  el número de posición), con "Darme de baja".
- **`/alumno/cuota`** -- estado por sede donde tengo alguna inscripción
  (al día / por vencer / vencida / sin pagos todavía). El botón de pagar
  con Mercado Pago no está: eso es una sub-etapa aparte.

**Encontré un bug real de RLS en mi propio diseño antes de terminar:** para
saber en qué posición de la lista de espera entra alguien nuevo hacía falta
contar cuánta gente ya estaba esperando esa clase -- pero un alumno común,
por RLS, solo puede ver *sus propias* filas de `inscripciones` (a propósito,
por privacidad). Un `count()` hecho desde la Server Action con el cliente
del usuario iba a dar casi siempre 0 o 1, no el total real. Lo resolví
igual que `aprobado_en`/`vencimiento` del paso 2: un trigger
`security definer` (`fn_asignar_posicion_espera`) calcula la posición en la
misma transacción del insert, sin que la app necesite verla. Mismo
problema con el cupo: para que el alumno pueda ver si una clase tiene lugar
sin ver quiénes están anotados, agregué la vista `v_cupo_clases` (conteo
agregado nada más, ninguna fila individual).

**A propósito, no implementado todavía:** cuando alguien se da de baja de
una clase llena, el primero de la lista de espera NO se promueve
automáticamente a "activa". Lo evalué (un trigger `AFTER UPDATE`), pero si
la promoción fallara por cualquier motivo (el candidato ahora tiene un
horario que se superpone con otra clase, por ejemplo), esa falla haría
rollback de TODA la transacción -- incluida la baja original de la otra
persona, que vería un error que no tiene nada que ver con lo que estaba
haciendo. Mejor resolverlo junto con las notificaciones push (para poder
avisarle a quien fue promovido), con manejo de errores que aísle un intento
de promoción fallido sin tocar la operación que lo disparó.

Validé el flujo completo contra Postgres local: cupo lleno cae a lista de
espera, la posición FIFO se asigna bien con múltiples alumnos, y que un
alumno viendo `v_cupo_clases` obtiene el conteo total pero un `select`
directo a `inscripciones` solo le muestra sus propias filas. `tsc`/`lint`/
`build` limpios y las rutas nuevas confirmadas protegidas sin sesión.

## Paso 5c: Profesor -- clases y asistencia

No hizo falta ninguna migración nueva: todo lo que necesitaba esta
sub-etapa (la vista `v_cupo_clases`, la regla de visibilidad, los triggers
de cuota/aviso) ya estaba de pasos anteriores.

- **`/profesor/clases`** -- solo las clases propias (filtrado por
  `profesor_id`, no todas las que existen), con cupo ocupado/total.
- **`/profesor/clases/[id]`** -- selector de fecha (para poder tomar
  asistencia de una sesión pasada, no solo "hoy"), lista de alumnos
  visibles con estado de cuota **de solo lectura** (badge, sin forma de
  tocarlo), botones Presente/Ausente, y "Editar datos" inline (nombre,
  apellido, teléfono -- el trigger del paso 3 bloquea que toque rol o
  email aunque se lo pidan por fuera de este formulario).
- Si hay alumnos anotados en la clase que todavía no tienen ninguna cuota
  aprobada, no desaparecen sin explicación: un cartel dice cuántos son
  ("hay 2 alumnos más anotados, pero todavía no tienen cuota aprobada")
  sin revelar quiénes -- ni la propia consulta a `profiles` puede
  resolverlos por RLS, así que ni yo si quisiera podría mostrarlos.
- Marcar "Presente" con la cuota vencida en esa sede lo rechaza el mismo
  trigger del paso 3 (`fn_validar_cuota_para_asistencia`) y el mensaje se
  muestra tal cual -- es la "alerta" que pedía el documento en la sección 2,
  resuelta como feedback inmediato en vez de un sistema de notificaciones
  aparte. "Ausente" nunca se bloquea por esto.

**Importante para poder probarlo con datos reales:** como todavía no existe
el pago con Mercado Pago (eso es otra sub-etapa), ningún alumno real va a
tener una cuota aprobada todavía -- así que el roster de cualquier clase va
a aparecer vacío (con el cartel de "alumnos no visibles") y "Presente" va a
fallar siempre, **a propósito**, hasta que haya una forma de aprobar pagos.
Para probar el flujo completo ahora mismo, aprobá un pago de prueba a mano
en el SQL Editor:
```sql
insert into public.pagos (alumno_id, sede_id, frecuencia_semanal, monto, medio, estado, aprobado_en)
values ('<uuid del alumno>', '<uuid de la sede>', 1, 41000, 'efectivo', 'aprobado', now());
```
(los uuids salen del Table Editor, tablas `alumnos` y `sedes`). Con eso
debería aparecer en el roster del profesor y "Presente" debería funcionar.

Validé contra Postgres local los cinco casos: profesor ve el conteo total
de inscriptos de su clase pero solo puede resolver el perfil del alumno
que sí pagó, marcar ausente siempre funciona, marcar presente funciona con
cuota al día, y falla con el mensaje esperado cuando la cuota está
vencida. `tsc`/`lint`/`build` limpios y rutas nuevas confirmadas
protegidas sin sesión.

## Deploy

Pensado para desplegar en [Vercel](https://vercel.com). Las env vars de
`.env.local` se configuran igual en el dashboard de Vercel (Project Settings
> Environment Variables).
