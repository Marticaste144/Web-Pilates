# MUV Gimnasia Postural

Plataforma web para la gestión de MUV Gimnasia Postural (3 sedes: MUV FITNESS,
MUV POSTURAL, MUV PILATES) — inscripciones, cuotas, asistencia y avisos, con
3 roles: admin, profesor y alumno.

**Stack:** Next.js (App Router) + TypeScript · Supabase (Postgres + Auth + Storage)
· Tailwind CSS · Mercado Pago (Checkout Pro) · PWA.

## Etapas del proyecto

1. ✅ Estructura inicial + configuración de Supabase
2. ✅ Modelo de datos (Sede, Profesor, Alumno, Clase, Inscripción, Pago, Asistencia, Aviso)
3. ⬜ Autenticación con 3 roles y protección de rutas
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
lib/supabase/
  client.ts              cliente de Supabase para Client Components
  server.ts              cliente de Supabase para Server Components / Server Actions
  middleware.ts          helper para refrescar la sesión en cada request
proxy.ts                 proxy de Next.js 16 (ex-middleware, usa el helper de arriba)
supabase/migrations/     migraciones SQL (esquema, triggers, RLS)
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

**Lo que queda para los próximos pasos** (a propósito, no es parte del
modelo de datos): la lógica de "a qué alumnos ve un profesor" (recién cuando
tienen la primera cuota aprobada), "no dejar tomar asistencia si la cuota
está vencida", y "un aviso bloquea toda la sede ese día" — todo esto se
resuelve con RPCs/Server Actions en el paso 5, ya que necesitan devolver un
mensaje claro al usuario en vez de solo rechazar el insert. Las políticas de
RLS por rol (qué puede ver/editar cada quién) se completan en el paso 3.

**Supuestos que tomé porque no estaban definidos:** el día de vencimiento de
la cuota queda como un campo explícito por pago (no se infiere del período)
porque no se definió el día de corte del ciclo de facturación; "próxima a
vencer" en la vista usa el umbral de 5 días que mencionaste en la sección 7.
Avisame si alguno de estos dos hay que ajustarlo.

## Deploy

Pensado para desplegar en [Vercel](https://vercel.com). Las env vars de
`.env.local` se configuran igual en el dashboard de Vercel (Project Settings
> Environment Variables).
