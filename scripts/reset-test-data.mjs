#!/usr/bin/env node
// Script de uso puntual (no forma parte de la app en runtime) para:
//   1. Limpiar profesores/alumnos de prueba (y todo lo que cuelga de ellos
//      en cascada: inscripciones, pagos, pagos_auditoria, asistencias).
//   2. Crear 3 alumnos + 3 profesores de prueba nuevos, con contraseña fija
//      (sin pasar por el flujo de invitación por mail).
//   3. Cargar las clases reales pedidas para las 3 sedes.
//
// Corre local, con tus credenciales reales de .env.local -- este entorno no
// tiene acceso a la base de producción, así que no se puede ejecutar desde
// acá. Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
//
// Uso:
//   node scripts/reset-test-data.mjs            -- solo preview (dry run), no borra ni crea nada
//   node scripts/reset-test-data.mjs --confirm   -- ejecuta todo (borrado + alta + clases)
//
// El paso de borrado es irreversible. Corré primero SIN --confirm, revisá el
// preview con atención (en particular la sección de pagos con Mercado Pago
// -- ahí aparecería el pago real que se usó para probar el webhook, si
// todavía está asociado a una cuenta de prueba), y recién después repetí
// el comando CON --confirm si todo se ve como se espera.

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function cargarEnvLocal() {
  const path = new URL("../.env.local", import.meta.url);
  if (!existsSync(path)) {
    console.error("No se encontró .env.local en la raíz del proyecto. Copiá .env.local.example y completá los valores reales.");
    process.exit(1);
  }
  const contenido = readFileSync(path, "utf-8");
  for (const linea of contenido.split("\n")) {
    const l = linea.trim();
    if (!l || l.startsWith("#")) continue;
    const eq = l.indexOf("=");
    if (eq === -1) continue;
    const key = l.slice(0, eq).trim();
    const value = l.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

cargarEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CONFIRM = process.argv.includes("--confirm");

// ---------------------------------------------------------------------------
// Datos de las cuentas nuevas -- única fuente de verdad, se usa tanto para
// crearlas como para imprimir la tabla final de credenciales.
// ---------------------------------------------------------------------------
const ALUMNOS = [
  { nombre: "Lucía", apellido: "Fernández", email: "castellanimartina3+alumno1@gmail.com", password: "Alumno1Muv26" },
  { nombre: "Martín", apellido: "Gómez", email: "castellanimartina3+alumno2@gmail.com", password: "Alumno2Muv26" },
  { nombre: "Valentina", apellido: "Rossi", email: "castellanimartina3+alumno3@gmail.com", password: "Alumno3Muv26" },
];

const PROFESORES = [
  { nombre: "Sabina", apellido: "Duarte", sede: "MUV PILATES", email: "castellanimartina3+profesora.sabina@gmail.com", password: "Pilates2026Muv" },
  { nombre: "Bruno", apellido: "Álvarez", sede: "MUV FITNESS", email: "castellanimartina3+profesor.fitness@gmail.com", password: "Fitness2026Muv" },
  { nombre: "Carla", apellido: "Medina", sede: "MUV POSTURAL", email: "castellanimartina3+profesor.postural@gmail.com", password: "Postural2026Muv" },
];

// dia_semana: 1=lunes .. 7=domingo (ver lib/dias-semana.ts)
const LUN = 1, MAR = 2, MIE = 3, JUE = 4, VIE = 5;

function clasesPilates() {
  const dias = [LUN, MAR, MIE, JUE, VIE];
  const turnosBase = [["16:00", "17:00"], ["17:00", "18:00"], ["18:00", "19:00"], ["19:00", "20:00"]];
  const turnosExtra = [["09:00", "10:00"], ["10:00", "11:00"]];
  const filas = [];
  for (const dia of dias) {
    for (const [inicio, fin] of turnosBase) {
      filas.push({ dia_semana: dia, hora_inicio: inicio, hora_fin: fin });
    }
    if (dia === MIE || dia === VIE) {
      for (const [inicio, fin] of turnosExtra) {
        filas.push({ dia_semana: dia, hora_inicio: inicio, hora_fin: fin });
      }
    }
  }
  return filas;
}

// Representativos, no exhaustivos -- pedido explícito para Fitness/Postural.
const CLASES_FITNESS = [
  { dia_semana: MAR, hora_inicio: "08:00", hora_fin: "09:00" },
  { dia_semana: MAR, hora_inicio: "09:00", hora_fin: "10:00" },
  { dia_semana: MAR, hora_inicio: "18:00", hora_fin: "19:00" },
  { dia_semana: MAR, hora_inicio: "19:00", hora_fin: "20:00" },
];

const CLASES_POSTURAL = [
  { dia_semana: JUE, hora_inicio: "08:00", hora_fin: "09:00" },
  { dia_semana: JUE, hora_inicio: "09:00", hora_fin: "10:00" },
  { dia_semana: JUE, hora_inicio: "18:00", hora_fin: "19:00" },
  { dia_semana: JUE, hora_inicio: "19:00", hora_fin: "20:00" },
];

const CUPO = 8;

// ---------------------------------------------------------------------------
// Fase 0: preview (siempre corre, nunca escribe nada)
// ---------------------------------------------------------------------------
async function preview() {
  console.log("\n=== PREVIEW: lo que se va a borrar si corrés con --confirm ===\n");

  const { data: perfiles, error: errPerfiles } = await admin
    .from("profiles")
    .select("id, role, nombre, apellido, email")
    .neq("role", "admin")
    .order("role")
    .order("apellido");

  if (errPerfiles) {
    console.error("No se pudo leer profiles:", errPerfiles.message);
    process.exit(1);
  }

  if (!perfiles || perfiles.length === 0) {
    console.log("No hay profesores ni alumnos cargados -- nada para borrar.");
  } else {
    for (const p of perfiles) {
      console.log(`  [${p.role}] ${p.nombre} ${p.apellido} <${p.email}>  (id: ${p.id})`);
    }
    console.log(`\nTotal: ${perfiles.length} cuenta(s) (profesores + alumnos).`);
  }

  const { count: countClases } = await admin.from("clases").select("id", { count: "exact", head: true });
  console.log(`\nClases que se van a borrar (requisito para poder borrar profesores -- clases.profesor_id es "on delete restrict"): ${countClases ?? 0}`);

  // Chequeo de plata real: cualquier pago con Mercado Pago asociado a una de
  // estas cuentas. Si aparece algo acá (sobre todo con estado='aprobado' o
  // con mercadopago_payment_id cargado), PARAR y revisar a mano antes de
  // confirmar -- podría ser el pago real usado para depurar el webhook.
  const idsNoAdmin = (perfiles ?? []).map((p) => p.id);
  if (idsNoAdmin.length > 0) {
    const { data: pagosMp, error: errPagos } = await admin
      .from("pagos")
      .select("id, alumno_id, sede_id, monto, estado, mercadopago_payment_id, created_at")
      .eq("medio", "mercadopago")
      .in("alumno_id", idsNoAdmin);

    if (errPagos) {
      console.error("No se pudo leer pagos:", errPagos.message);
      process.exit(1);
    }

    if (pagosMp && pagosMp.length > 0) {
      console.log(`\n⚠️  ATENCIÓN: hay ${pagosMp.length} pago(s) con Mercado Pago asociados a estas cuentas -- se van a borrar en cascada junto con el alumno:`);
      for (const pago of pagosMp) {
        console.log(
          `  - pago ${pago.id} | alumno ${pago.alumno_id} | $${pago.monto} | estado=${pago.estado} | mp_payment_id=${pago.mercadopago_payment_id ?? "-"} | ${pago.created_at}`,
        );
      }
      console.log("  Si alguno de estos es el pago real que se usó para probar el cobro/webhook, guardá sus datos antes de confirmar (no se puede recuperar después del borrado).");
    } else {
      console.log("\nNo hay pagos con Mercado Pago asociados a estas cuentas.");
    }
  }

  console.log("\n=== Fin del preview ===");
  if (!CONFIRM) {
    console.log("\nNo se borró ni se creó nada (corriste sin --confirm). Si el preview de arriba se ve bien, repetí:\n  node scripts/reset-test-data.mjs --confirm\n");
  }
}

// ---------------------------------------------------------------------------
// Fase 1: borrado
// ---------------------------------------------------------------------------
async function borrarDatosDePrueba() {
  console.log("\n=== Borrando clases (arrastra inscripciones/asistencias en cascada) ===");
  const { error: errClases, count } = await admin
    .from("clases")
    .delete({ count: "exact" })
    .not("id", "is", null);
  if (errClases) {
    console.error("No se pudieron borrar las clases:", errClases.message);
    process.exit(1);
  }
  console.log(`Clases borradas: ${count ?? 0}`);

  console.log("\n=== Borrando profesores y alumnos (arrastra pagos/inscripciones en cascada) ===");
  const { data: perfiles, error: errPerfiles } = await admin
    .from("profiles")
    .select("id, role, nombre, apellido, email")
    .neq("role", "admin");

  if (errPerfiles) {
    console.error("No se pudo leer profiles:", errPerfiles.message);
    process.exit(1);
  }

  for (const p of perfiles ?? []) {
    const { error } = await admin.auth.admin.deleteUser(p.id);
    if (error) {
      console.error(`  ✗ ${p.role} ${p.nombre} ${p.apellido} <${p.email}>: ${error.message}`);
    } else {
      console.log(`  ✓ borrado: [${p.role}] ${p.nombre} ${p.apellido} <${p.email}>`);
    }
  }
}

// ---------------------------------------------------------------------------
// Fase 2: alta de cuentas nuevas
// ---------------------------------------------------------------------------
async function crearCuentas() {
  console.log("\n=== Creando alumnos de prueba ===");
  const alumnosCreados = [];
  for (const a of ALUMNOS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: a.email,
      password: a.password,
      email_confirm: true,
      user_metadata: { role: "alumno", nombre: a.nombre, apellido: a.apellido },
    });
    if (error || !data?.user) {
      console.error(`  ✗ ${a.email}: ${error?.message ?? "error desconocido"}`);
      continue;
    }
    console.log(`  ✓ ${a.nombre} ${a.apellido} <${a.email}>`);
    alumnosCreados.push({ ...a, id: data.user.id });
  }

  console.log("\n=== Creando profesores de prueba ===");
  const profesoresCreados = [];
  for (const p of PROFESORES) {
    const { data, error } = await admin.auth.admin.createUser({
      email: p.email,
      password: p.password,
      email_confirm: true,
      user_metadata: { role: "profesor", nombre: p.nombre, apellido: p.apellido },
    });
    if (error || !data?.user) {
      console.error(`  ✗ ${p.email}: ${error?.message ?? "error desconocido"}`);
      continue;
    }
    console.log(`  ✓ ${p.nombre} ${p.apellido} (${p.sede}) <${p.email}>`);
    profesoresCreados.push({ ...p, id: data.user.id });
  }

  return { alumnosCreados, profesoresCreados };
}

// ---------------------------------------------------------------------------
// Fase 3: carga de clases
// ---------------------------------------------------------------------------
async function cargarClases(profesoresCreados) {
  console.log("\n=== Cargando clases ===");

  const { data: sedes, error: errSedes } = await admin.from("sedes").select("id, nombre");
  if (errSedes || !sedes) {
    console.error("No se pudieron leer las sedes:", errSedes?.message);
    return;
  }
  const sedeIdPorNombre = new Map(sedes.map((s) => [s.nombre, s.id]));

  const filas = [];
  for (const p of profesoresCreados) {
    const sedeId = sedeIdPorNombre.get(p.sede);
    if (!sedeId) {
      console.error(`  ✗ No se encontró la sede "${p.sede}" -- se saltean sus clases.`);
      continue;
    }
    const turnos = p.sede === "MUV PILATES" ? clasesPilates() : p.sede === "MUV FITNESS" ? CLASES_FITNESS : CLASES_POSTURAL;
    for (const t of turnos) {
      filas.push({
        sede_id: sedeId,
        profesor_id: p.id,
        dia_semana: t.dia_semana,
        hora_inicio: t.hora_inicio,
        hora_fin: t.hora_fin,
        cupo: CUPO,
      });
    }
  }

  if (filas.length === 0) {
    console.log("No hay clases para cargar (¿fallaron todos los profesores arriba?).");
    return;
  }

  const { error: errInsert, count } = await admin.from("clases").insert(filas, { count: "exact" });
  if (errInsert) {
    console.error("No se pudieron insertar las clases:", errInsert.message);
    return;
  }
  console.log(`Clases creadas: ${count ?? filas.length}`);
}

// ---------------------------------------------------------------------------
async function main() {
  await preview();

  if (!CONFIRM) {
    return;
  }

  await borrarDatosDePrueba();
  const { profesoresCreados } = await crearCuentas();
  await cargarClases(profesoresCreados);

  console.log("\n=== Credenciales de las cuentas nuevas ===\n");
  console.log("Rol       | Nombre             | Sede           | Email                                              | Contraseña");
  console.log("----------|--------------------|----------------|----------------------------------------------------|----------------");
  for (const p of PROFESORES) {
    console.log(
      `Profesor  | ${`${p.nombre} ${p.apellido}`.padEnd(18)} | ${p.sede.padEnd(14)} | ${p.email.padEnd(52)} | ${p.password}`,
    );
  }
  for (const a of ALUMNOS) {
    console.log(
      `Alumno    | ${`${a.nombre} ${a.apellido}`.padEnd(18)} | ${"-".padEnd(14)} | ${a.email.padEnd(52)} | ${a.password}`,
    );
  }
  console.log("\nListo.");
}

main();
