#!/usr/bin/env node
// Script de uso puntual (no forma parte de la app en runtime) para borrar
// POR COMPLETO toda la carga demo -- tanto la de scripts/cargar-alumnas-
// demo.mjs (alumnas ficticias en clases YA EXISTENTES de Sabina/Laila) como
// la de scripts/cargar-demo-profe-prueba.mjs (que además crea CLASES demo
// nuevas). Identifica cada fila por alumnos.es_demo=true (migración
// 20260919090000_alumnas_demo_flag.sql) y clases.es_demo=true (migración
// 20260920090000_clases_demo_flag.sql), nunca por nombre/patrón.
//
// Qué borra:
//   1) Todo lo que cuelga de una ALUMNA demo, vía "on delete cascade" hacia
//      alumnos.id (20260906090000_identidad_alumnas.sql): la fila de
//      "alumnos" en sí, sus inscripciones, asistencias, fichas_evaluacion,
//      ficha_evaluacion_notas, ficha_evaluacion_pruebas_funcionales,
//      planificaciones INDIVIDUALES (con sus días/bloques/ejercicios/
//      semanas) y los pagos demo mínimos.
//   2) Todo lo que cuelga de una CLASE demo, vía "on delete cascade" hacia
//      clases.id (20260810173955_initial_schema.sql /
//      20260902090000_planificaciones.sql): la fila de "clases" en sí y
//      cualquier planificación GRUPAL de esa clase (las inscripciones/
//      asistencias ya deberían haberse ido en el paso 1, porque toda alumna
//      de una clase demo es también es_demo=true).
// Dos DELETE alcanzan -- Postgres se encarga del resto vía cascada.
//
// Qué NO toca (a propósito, no hay nada de esto en la carga demo, pero se
// deja documentado por si el criterio de "demo" se extiende en el futuro):
//   - Ninguna clase/profesor/sede/actividad REAL -- cargar-alumnas-demo.mjs
//     nunca crea clases, solo se inscribe en las que ya existían;
//     cargar-demo-profe-prueba.mjs solo crea clases marcadas es_demo=true.
//   - Ningún usuario de Auth -- profile_id de toda alumna demo es NULL.
//   - Ningún archivo de Storage -- ninguna carga demo sube ningún Excel.
//
// Uso:
//   node scripts/eliminar-alumnas-demo.mjs            -- preview (dry run), no borra nada
//   node scripts/eliminar-alumnas-demo.mjs --confirm   -- borra de verdad

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function cargarEnvLocal() {
  const path = new URL("../.env.local", import.meta.url);
  if (!existsSync(path)) {
    console.error("No se encontró .env.local en la raíz del proyecto.");
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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CONFIRMAR = process.argv.includes("--confirm");

async function main() {
  console.log(CONFIRMAR ? "MODO: borrado real (--confirm)" : "MODO: preview (dry run) -- no se borra nada todavía");

  const { data: alumnosDemo, error } = await supabase.from("alumnos").select("id, nombre, apellido, profile_id").eq("es_demo", true);
  if (error) throw error;

  if (!alumnosDemo || alumnosDemo.length === 0) {
    console.log("No hay ninguna alumna marcada como demo -- nada para borrar.");
    return;
  }

  // Chequeo de seguridad: si por algún motivo una fila es_demo=true tuviera
  // profile_id (nunca debería pasar -- la carga siempre lo deja null), se
  // avisa y se corta en vez de borrar algo que podría tener una cuenta real
  // vinculada.
  const conCuenta = alumnosDemo.filter((a) => a.profile_id !== null);
  if (conCuenta.length > 0) {
    console.error(`✗ ${conCuenta.length} fila(s) es_demo=true tienen profile_id no nulo -- no se borra nada, revisá a mano:`, conCuenta);
    process.exit(1);
  }

  console.log(`\n${alumnosDemo.length} alumnas demo encontradas:`);
  for (const a of alumnosDemo) console.log(`  - ${a.nombre} ${a.apellido} (${a.id})`);

  const ids = alumnosDemo.map((a) => a.id);
  const [{ count: pagos }, { count: insc }, { count: asist }, { count: fichas }, { count: notas }, { count: pruebas }, { count: planIndividuales }] = await Promise.all([
    supabase.from("pagos").select("id", { count: "exact", head: true }).in("alumno_id", ids),
    supabase.from("inscripciones").select("id", { count: "exact", head: true }).in("alumno_id", ids),
    supabase.from("asistencias").select("id", { count: "exact", head: true }).in("alumno_id", ids),
    supabase.from("fichas_evaluacion").select("id", { count: "exact", head: true }).in("alumno_id", ids),
    supabase.from("ficha_evaluacion_notas").select("id", { count: "exact", head: true }).in("alumno_id", ids),
    supabase.from("ficha_evaluacion_pruebas_funcionales").select("id", { count: "exact", head: true }).in("alumno_id", ids),
    supabase.from("planificaciones").select("id", { count: "exact", head: true }).in("alumno_id", ids),
  ]);
  console.log(
    `\nSe van a borrar en cascada (por alumna): ${pagos} pagos demo, ${insc} inscripciones, ${asist} asistencias, ${fichas} fichas, ${notas} notas de evolución, ${pruebas} pruebas funcionales, ${planIndividuales} planificaciones individuales.`,
  );

  // clases.es_demo es una columna nueva (20260920090000_clases_demo_flag.sql)
  // -- si todavía no se aplicó esa migración, se avisa claro en vez de
  // fallar con un error crudo de "columna no existe".
  const { data: clasesDemo, error: errorClasesDemo } = await supabase.from("clases").select("id, dia_semana, hora_inicio, hora_fin, cupo").eq("es_demo", true);
  if (errorClasesDemo) {
    if (errorClasesDemo.message?.includes("es_demo")) {
      console.error(
        "\n✗ La columna clases.es_demo todavía no existe -- falta aplicar la migración 20260920090000_clases_demo_flag.sql antes de poder limpiar clases demo (las alumnas demo sí se pudieron borrar arriba si llegaste a este punto).",
      );
      throw errorClasesDemo;
    }
    throw errorClasesDemo;
  }

  let planGrupales = 0;
  if (clasesDemo && clasesDemo.length > 0) {
    console.log(`\n${clasesDemo.length} clases demo encontradas:`);
    for (const c of clasesDemo) console.log(`  - dia ${c.dia_semana} ${c.hora_inicio}-${c.hora_fin} cupo ${c.cupo} (${c.id})`);
    const claseIds = clasesDemo.map((c) => c.id);
    const { count } = await supabase.from("planificaciones").select("id", { count: "exact", head: true }).in("clase_id", claseIds);
    planGrupales = count ?? 0;
    console.log(`Se van a borrar en cascada (por clase): ${planGrupales} planificaciones grupales.`);
  } else {
    console.log("\nNo hay ninguna clase marcada como demo.");
  }

  if (!CONFIRMAR) {
    console.log("\nEsto fue un preview -- no se borró nada. Volvé a correr con --confirm para ejecutar el borrado real.");
    return;
  }

  const { error: errorDelete } = await supabase.from("alumnos").delete().eq("es_demo", true);
  if (errorDelete) throw errorDelete;
  console.log(`\n✓ ${alumnosDemo.length} alumnas demo y todo lo que colgaba de ellas fueron eliminadas.`);

  if (clasesDemo && clasesDemo.length > 0) {
    const { error: errorDeleteClases } = await supabase.from("clases").delete().eq("es_demo", true);
    if (errorDeleteClases) throw errorDeleteClases;
    console.log(`✓ ${clasesDemo.length} clases demo y todo lo que colgaba de ellas fueron eliminadas.`);
  }
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
