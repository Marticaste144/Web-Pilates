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
5. 🔶 Pantallas funcionales por rol -- en curso: 5a Admin ✅ · 5b Alumno ✅ · 5c Profesor ✅ · 5d Mercado Pago ✅

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

## Paso 5d: pago real con Mercado Pago (Checkout Pro)

Reemplaza el `insert` manual por SQL Editor que veníamos usando para
probar: ahora el alumno paga de verdad y el webhook aprueba el pago solo.

### Configurar

1. En el [panel de Mercado Pago](https://www.mercadopago.com.ar/developers/panel) →
   Tus integraciones → tu app → **Credenciales de producción** (o de
   prueba, para probar sin plata real): copiá el **Access Token** a
   `MERCADOPAGO_ACCESS_TOKEN`.
2. En la misma sección → **Webhooks** → creá una notificación para el
   evento `payment` apuntando a `https://tu-dominio/api/mercadopago/webhook`
   (con `ngrok` o similar si estás probando en local). Ahí te dan una
   **Clave secreta** -- copiala a `MERCADOPAGO_WEBHOOK_SECRET`. Es
   opcional pero recomendada (ver más abajo por qué no es obligatoria).
3. `NEXT_PUBLIC_SITE_URL` (ya estaba en el .env desde el paso 1) tiene que
   ser la URL pública real de la app -- Mercado Pago redirige ahí después
   de pagar, y le manda el webhook a esa misma URL.

### Cómo funciona

- **`/alumno/cuota`** ahora tiene un botón "Pagar con Mercado Pago" en
  cualquier sede que no esté "al día" (con cuota al día no se ofrece
  pagar: como el vencimiento es rodante -- ver paso 2 --, pagar de más
  ahí adentro correría el vencimiento para ATRÁS en vez de sumar, así
  que no tiene sentido ofrecerlo).
- Al tocar pagar (`iniciarPagoMercadoPago`, `lib/alumno/pago-actions.ts`):
  la frecuencia semanal sale de contar las clases activas reales del
  alumno en esa sede (no se pide a mano), se busca el arancel vigente
  para esa combinación, se crea la fila en `pagos` con `estado='pendiente'`,
  se crea una preferencia de Checkout Pro, y se redirige al alumno a la
  pasarela de Mercado Pago.
- **`/api/mercadopago/webhook`** es lo que realmente aprueba el pago:
  Mercado Pago lo llama server-a-server cuando el estado cambia. Nunca se
  le cree al *contenido* de esa llamada -- siempre se le vuelve a
  preguntar a la API autenticada de Mercado Pago "¿qué pasó con este pago
  en realidad?" antes de tocar la base, así que aunque alguien mande un
  webhook falso, lo único que logra es que se le pregunte a Mercado Pago
  por un pago que no le pertenece (`external_reference` no va a matchear
  ningún `pagos.id` real). La verificación de firma con
  `MERCADOPAGO_WEBHOOK_SECRET` (usando el validador que trae el SDK
  oficial) es una capa extra sobre eso, no la única defensa -- por eso es
  opcional y no bloqueante si todavía no la configuraste.
- El `update` a `pagos.estado` lo hace un cliente con `service_role`
  (`lib/supabase/admin.ts`, ya existía del paso 5a) porque el webhook no
  tiene sesión de ningún usuario. Ese mismo `update` dispara solo los
  triggers de `aprobado_en`/`vencimiento` (paso 2) y de
  `pagos_auditoria` (paso 3) -- no hizo falta escribir nada nuevo para
  eso, ya estaba armado.

**Validé:** el validador de firma del SDK con una firma real (HMAC
correcto), un secreto incorrecto y un `data.id` manipulado -- los dos
últimos casos los rechaza bien. El `update` exacto que hace el webhook
contra Postgres local, confirmando que calcula `vencimiento` y deja el
registro en `pagos_auditoria` solo. Y que la ruta responde con un error
controlado (502, no un crash) si `MERCADOPAGO_ACCESS_TOKEN` falta o el
pago no se puede consultar. Lo que **no** pude probar acá: el flujo real
contra la API de Mercado Pago (crear una preferencia de verdad, pagar,
recibir el webhook real) -- necesita tus credenciales, que no tengo en
este entorno. Con las credenciales de **prueba** de Mercado Pago (usuarios
de test, sin plata real) podés probar el circuito completo antes de pasar
a producción.

### Fix: "back_urls invalid. Wrong format" en producción

Causa real (reportada y confirmada en el sitio deployado, no en local):
`iniciarPagoMercadoPago` tenía `process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`.
Mercado Pago **bloquea `back_urls`/`notification_url` en `http://` desde
marzo 2025** -- si `NEXT_PUBLIC_SITE_URL` no llegaba a estar disponible en
el momento justo, el fallback armaba URLs `http://localhost:3000/...` y
esto era exactamente lo que rechazaba.

El motivo por el que corregir la variable en Vercel y darle "Redeploy" no
alcanzaba: las env vars `NEXT_PUBLIC_*` de Next.js se inyectan **en el
bundle durante `next build`**, no en runtime. Si la variable se agrega
*después* de un build, hace falta que corra un build nuevo -- "Redeploy"
en Vercel puede reusar el artefacto ya compilado sin rebuildear, en cuyo
caso el código deployado sigue teniendo el valor viejo (o `undefined`)
quemado adentro, sin importar lo que diga el dashboard.

Se sacó el fallback silencioso de las 3 Server Actions que lo tenían
(`iniciarPagoMercadoPago`, `invitarProfesor`, `requestPasswordReset` -- las
otras dos nunca fallaron en la práctica porque nadie las había probado
todavía en producción, pero tenían la misma bomba de tiempo) y se
centralizó en `lib/site-url.ts` (`getSiteUrl()`), que tira un error claro
en el momento si la variable no está, en vez de armar una URL rota que
recién explota adentro de la llamada a Mercado Pago con un mensaje que no
dice nada de la causa real. También hace `trim()` y saca la barra final,
por si el valor pegado en Vercel tenía un espacio/salto de línea de más.

Como este fix es un commit nuevo, el próximo deploy automático de Vercel
ya corre un build real y debería resolver el problema solo -- si seguís
viendo el mismo error después de que este commit se despliegue, es que
`NEXT_PUBLIC_SITE_URL` no está seteada en el **Environment** correcto
(Project Settings → Environment Variables: confirmá que esté marcada para
"Production", no solo para "Preview"/"Development").

### Fix: webhook rechazado con 401 "firma inválida" (pago sí aprobado en Mercado Pago)

Reportado con logs reales de Vercel: el pago se aprobaba de verdad del lado
de Mercado Pago (visible en su panel), pero `pagos.estado` nunca pasaba a
`aprobado` porque `/api/mercadopago/webhook` respondía 401 antes de llegar
a tocar la base.

Se revisó el código del validador de firma (`WebhookSignatureValidator` del
SDK oficial, v3.3.0) línea por línea contra la documentación real de
Mercado Pago y se encontraron/descartaron estas causas:

- **Bug real, corregido acá:** la ruta armaba `dataId` primero desde el
  query string (`?data.id=...`, que es la fuente correcta según la doc --
  es el valor que Mercado Pago usa para firmar) pero un par de líneas
  después lo pisaba con el `data.id` del body del POST si existía. En la
  práctica ambos valores suelen coincidir, pero no está garantizado, y
  documentalmente el query string es la fuente autoritativa -- así que se
  invirtió la prioridad (query string primero, body solo como fallback
  para notificaciones viejas que no mandan query string) y se agregó
  `.toLowerCase()` al `data.id`, como pide la doc para IDs alfanuméricos.
- **Bugs de versiones viejas del SDK, descartados:** hay dos issues abiertos
  en el repo del SDK (`mercadopago-nodejs` #458 y #459 -- desajuste de
  unidades en el `toleranceSeconds` y un `RangeError` con hashes `v1`
  multibyte) pero ambos ya estaban arreglados en la versión instalada acá
  (3.3.0), confirmado leyendo el código fuente compilado directamente en
  `node_modules/mercadopago/dist/utils/webhook/index.js`.
- **Hipótesis "hay una clave distinta para pagos": descartada.** La `Clave
  secreta` que se ve en *Tus integraciones → tu app → Webhooks → Configurar
  notificaciones* es una sola por aplicación y firma **todos** los tópicos
  que le lleguen a esa URL (`payment`, `merchant_order`, etc.), no hay una
  clave separada específica para pagos.
- **Hipótesis más probable, sin descartar: secreto de modo prueba vs
  producción.** Esa misma pantalla de Mercado Pago tiene un toggle
  "Modo pruebas" / "Modo productivo" arriba, y la clave secreta que muestra
  **cambia según qué modo esté seleccionado en ese momento** -- son dos
  valores distintos. Como el pago que falló fue con una tarjeta real
  (Mastercard, aprobado de verdad), el `MERCADOPAGO_ACCESS_TOKEN` en uso es
  el de producción; si `MERCADOPAGO_WEBHOOK_SECRET` se copió con el toggle
  en "Modo pruebas", es exactamente la clave equivocada para ese pago, y el
  SDK va a calcular un HMAC distinto al que mandó Mercado Pago →
  `SignatureMismatch`. **Antes de reintentar, volvé a esa pantalla, fijate
  que el toggle esté en "Modo productivo", y volvé a copiar la clave secreta
  desde ahí a `MERCADOPAGO_WEBHOOK_SECRET` en Vercel** (recordá que hace
  falta un build nuevo, no alcanza con "Redeploy" reusando el build viejo --
  mismo motivo que el bug de `back_urls` de más arriba, aunque en este caso
  la variable no es `NEXT_PUBLIC_*` así que si Vercel hace rebuild en cada
  push no debería ser un problema).
- El `catch` del validador ahora loguea el `reason` puntual (el enum
  `SignatureFailureReason` que expone el SDK: `SignatureMismatch`,
  `TimestampOutOfTolerance`, `MissingSignatureHeader`, etc.) junto con los
  valores crudos usados para armar el manifest (`dataId`, `x-request-id`,
  `x-signature`), para poder diagnosticar de una sola mirada a los logs de
  Vercel si vuelve a pasar, en vez de solo el mensaje genérico.

**Para reconciliar el pago que ya quedó aprobado en Mercado Pago pero
`pendiente` en la base** (mientras se corrige el secreto y no hace falta
esperar el próximo pago para probar), corré en el SQL Editor de Supabase,
reemplazando el id real del pago y el id de pago de Mercado Pago (ambos
visibles en el panel de Mercado Pago → Actividad):

```sql
update public.pagos
set estado = 'aprobado',
    mercadopago_payment_id = '<id-de-pago-de-mercado-pago>'
where id = '<id-de-la-fila-en-pagos>';
```

`aprobado_en`/`vencimiento` se calculan solos por el trigger del paso 2 en
cuanto `estado` pasa a `'aprobado'` -- no hace falta (ni se puede) cargarlos
a mano. Para encontrar el `id` de la fila en `pagos`, filtrá por
`alumno_id`, `sede_id` y `estado = 'pendiente'` con la fecha aproximada del
pago.

### Fix (parte 2): el 401 seguía pasando -- notificaciones de topic `merchant_order`

Después del fix de arriba, el 401 seguía apareciendo con pagos nuevos. El
log mejorado (con `reason`, `dataId` crudo, etc.) mostró la causa real:
`reason: 'SignatureMismatch'` en una request cuyo query string era
`?id=...&topic=merchant_order` -- no `?data.id=...&type=payment`. Ese
formato (`topic`/`id` en vez de `type`/`data.id`, User-Agent "MercadoPago
Feed v2.0") es el del feed viejo de **Merchant Orders**, un mecanismo de
notificación distinto (y anterior) al de los webhooks firmados de
`payment`, que Mercado Pago manda en paralelo a la misma
`notification_url` para toda compra hecha con Checkout Pro.

Confirmado contra la documentación oficial de Mercado Pago (búsqueda
específica sobre validación de firma para `merchant_order`): **las
notificaciones de topic `merchant_order` no se pueden validar con
x-signature** -- no es un bug de esta app ni de la clave secreta, Mercado
Pago mismo dice que esa firma no aplica/no es verificable para ese topic,
por más que el secreto usado sea el correcto. Así que la clave que ya
habías confirmado carácter por carácter era la correcta -- el problema no
era el secreto (ninguna de las dos hipótesis del secreto era la causa),
sino que el código intentaba validar-y-procesar como si fuera un webhook
de `payment` una notificación que nunca iba a poder pasar esa validación.
Tampoco tendría sentido procesarla igual: el `id` que manda `merchant_order`
es un id de orden, no un id de pago, así que `Payment.get({id})` con ese
valor habría fallado de todos modos.

Fix: la ruta ahora lee `type` (formato nuevo) o `topic` (formato viejo) del
query string **antes** de cualquier otra cosa, y si viene y no es
`"payment"`, devuelve `200 ok` de una sin validar firma ni consultar nada
-- se ignoran esas notificaciones a propósito, porque el estado del pago ya
llega completo y firmable por la notificación de topic `payment` que
Mercado Pago manda aparte para el mismo evento.

**Para confirmar que esto lo resuelve:** en los logs de Vercel, después de
un pago nuevo con este commit ya deployado, tendría que verse solamente la
call con `type=payment&data.id=...` pasando la validación de firma (o, si
seguís sin ver ninguna call de topic `payment` para el mismo pago, el
problema pasa a ser que Mercado Pago no está mandando esa notificación en
absoluto -- ahí ya no es un tema de este código, sino de configuración de
Webhooks en el panel).

### Fix (parte 3): el aviso de topic `payment` real también daba `SignatureMismatch`

Con `merchant_order` ya filtrado, la notificación de topic `payment` de
verdad (`dataId` = el mismo `payment_id` que Mercado Pago manda en la URL
de retorno después de pagar) seguía dando 401. Se volvió a comparar el
código contra la doc oficial, campo por campo:

- **Manifest**: `id:{data.id};request-id:{x-request-id};ts:{ts};`, con el
  `;` final incluido y sin espacios -- confirmado leyendo el
  `buildManifest()` real del SDK instalado, coincide exactamente.
- **Orden y separador del header `x-signature`** (`ts=...,v1=...`,
  separados por coma): confirmado, el `parseSignatureHeader()` del SDK usa
  coma como separador y `=` para cada par, igual que la doc.
- **Mayúsculas/minúsculas del `data.id`**: la doc pide lowercase; ya se
  había agregado `.toLowerCase()` en el fix anterior. Para un id
  puramente numérico como este no cambia nada, pero está bien igual.

Con el armado del manifest descartado como causa (coincide con la doc
línea por línea), lo que queda son dos explicaciones para un
`SignatureMismatch` real: el secreto no es el que Mercado Pago usó para
firmar, o el secreto tiene bytes de más (espacio/salto de línea al
copiarlo). Dos cambios:

1. **Se agregó `.trim()` al secreto leído de `MERCADOPAGO_WEBHOOK_SECRET`**
   antes de usarlo -- mismo tipo de bug que ya nos pasó una vez con
   `NEXT_PUBLIC_SITE_URL` (pegar en el dashboard de Vercel puede dejar un
   espacio o un salto de línea invisible al final, que "a ojo" comparando
   contra el panel de Mercado Pago no se nota, pero cambia el HMAC
   calculado por completo).
2. Se agregó `secretLength`/`secretLengthSinTrim` al log de error (el
   **largo** del secreto en runtime, nunca el valor) para poder comparar
   contra el largo real de la clave que copiaste, sin exponer el secreto
   en los logs.

**Pista más fuerte que un bug de código:** dijiste que verificaste el
secreto contra el que muestra Mercado Pago **"en modo prueba"**. Ese es
justo el dato que hacía falta -- la pantalla de *Webhooks → Configurar
notificaciones* muestra una clave secreta **distinta** según el toggle
"Modo pruebas" / "Modo productivo" esté activado, y son dos secretos
distintos de verdad, no la misma clave mostrada dos veces. Si el
`MERCADOPAGO_ACCESS_TOKEN` que estás usando en Vercel es el de
**producción** (empieza con `APP_USR-`), Mercado Pago firma sus webhooks
con el secreto de **modo productivo**, no con el de modo prueba -- así que
aunque el de modo prueba esté copiado perfecto, carácter por carácter, va
a dar `SignatureMismatch` siempre, porque es literalmente el secreto
equivocado para ese modo. Si en cambio el access token es el de prueba
(`TEST-...`), es al revés: ahí sí correspondería el secreto de modo
prueba, y valdría la pena confirmar que no haya espacios de más (con el
`secretLength` del punto 2).

**Siguiente paso concreto:** confirmá qué prefijo tiene
`MERCADOPAGO_ACCESS_TOKEN` en Vercel (`APP_USR-` = producción, `TEST-` =
prueba), andá a la pantalla de Webhooks de Mercado Pago, poné el toggle en
ese MISMO modo, copiá la clave secreta de ahí (no la de modo prueba) a
`MERCADOPAGO_WEBHOOK_SECRET`, esperá el build nuevo, y probá con otro pago.

## Deploy

Pensado para desplegar en [Vercel](https://vercel.com). Las env vars de
`.env.local` se configuran igual en el dashboard de Vercel (Project Settings
> Environment Variables).
