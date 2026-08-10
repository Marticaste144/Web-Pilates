# MUV Gimnasia Postural

Plataforma web para la gestión de MUV Gimnasia Postural (3 sedes: MUV FITNESS,
MUV POSTURAL, MUV PILATES) — inscripciones, cuotas, asistencia y avisos, con
3 roles: admin, profesor y alumno.

**Stack:** Next.js (App Router) + TypeScript · Supabase (Postgres + Auth + Storage)
· Tailwind CSS · Mercado Pago (Checkout Pro) · PWA.

## Etapas del proyecto

1. ✅ Estructura inicial + configuración de Supabase
2. ⬜ Modelo de datos (Sede, Profesor, Alumno, Clase, Inscripción, Pago, Asistencia, Aviso)
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

## Estructura del proyecto

```
app/                 rutas (App Router)
  api/health/         endpoint de chequeo de conexión a Supabase
lib/supabase/
  client.ts           cliente de Supabase para Client Components
  server.ts           cliente de Supabase para Server Components / Server Actions
  middleware.ts        helper para refrescar la sesión en cada request
proxy.ts               proxy de Next.js 16 (ex-middleware, usa el helper de arriba)
types/database.ts     tipos de la base (se regeneran en el paso 2 con `supabase gen types`)
public/manifest.json  manifest de la PWA (iconos placeholder por ahora)
```

## Deploy

Pensado para desplegar en [Vercel](https://vercel.com). Las env vars de
`.env.local` se configuran igual en el dashboard de Vercel (Project Settings
> Environment Variables).
