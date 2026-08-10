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
4. ⬜ Pantalla de login (web y mobile)
5. ⬜ Pantallas funcionales por rol

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
cualquiera pueda crearse una cuenta de dueña). Para vos misma:

1. Dashboard de Supabase → **Authentication → Users → Add user**
2. Completá tu email/contraseña
3. En **User Metadata** (formato JSON) poné:
   ```json
   { "role": "admin", "nombre": "Tu nombre", "apellido": "Tu apellido" }
   ```
4. Al crear el usuario, el trigger `fn_handle_new_user` (paso 2) crea sola la
   fila en `profiles` con `role = admin`. Con eso ya podés entrar por
   `/login` en la app.

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
las pantallas reales. El diseño visual del login (paso 4) todavía no está
aplicado -- los formularios actuales son a propósito mínimos.

## Deploy

Pensado para desplegar en [Vercel](https://vercel.com). Las env vars de
`.env.local` se configuran igual en el dashboard de Vercel (Project Settings
> Environment Variables).
