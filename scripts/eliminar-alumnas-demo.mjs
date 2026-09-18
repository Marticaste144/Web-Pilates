#!/usr/bin/env node
// Script de uso puntual (no forma parte de la app en runtime) para borrar
// POR COMPLETO la carga demo hecha por scripts/cargar-alumnas-demo.mjs --
// y solo esa carga: identifica cada fila por alumnos.es_demo = true (ver
// migración 20260919090000_alumnas_demo_flag.sql), nunca por nombre/patrón.
//
// Qué borra (todo lo que cuelga de una alumna demo, vía "on delete cascade"
// hacia alumnos.id -- ver 20260906090000_identidad_alumnas.sql): la fila de
// "alumnos" en sí, sus inscripciones, asistencias, fichas_evaluacion,
// ficha_evaluacion_notas, ficha_evaluacion_pruebas_funcionales y los pagos
// demo mínimos (creados solo para poder marcar "presente" -- ver
// scripts/cargar-alumnas-demo.mjs). Un solo DELETE sobre "alumnos" alcanza
// -- Postgres se encarga del resto.
//
// Qué NO toca (a propósito, no hay nada de esto en la carga demo, pero se
// deja documentado por si el criterio de "demo" se extiende en el futuro):
//   - Ninguna clase/profesor/sede/actividad real -- la carga nunca creó
//     ninguna, solo se inscribió en las que ya existían.
//   - Ningún usuario de Auth -- profile_id de toda alumna demo es NULL.
//   - Ningún archivo de Storage -- la carga no subió ningún Excel.
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
  const [{ count: pagos }, { count: insc }, { count: asist }, { count: fichas }, { count: notas }, { count: pruebas }] = await Promise.all([
    supabase.from("pagos").select("id", { count: "exact", head: true }).in("alumno_id", ids),
    supabase.from("inscripciones").select("id", { count: "exact", head: true }).in("alumno_id", ids),
    supabase.from("asistencias").select("id", { count: "exact", head: true }).in("alumno_id", ids),
    supabase.from("fichas_evaluacion").select("id", { count: "exact", head: true }).in("alumno_id", ids),
    supabase.from("ficha_evaluacion_notas").select("id", { count: "exact", head: true }).in("alumno_id", ids),
    supabase.from("ficha_evaluacion_pruebas_funcionales").select("id", { count: "exact", head: true }).in("alumno_id", ids),
  ]);
  console.log(
    `\nSe van a borrar en cascada: ${pagos} pagos demo, ${insc} inscripciones, ${asist} asistencias, ${fichas} fichas, ${notas} notas de evolución, ${pruebas} pruebas funcionales.`,
  );

  if (!CONFIRMAR) {
    console.log("\nEsto fue un preview -- no se borró nada. Volvé a correr con --confirm para ejecutar el borrado real.");
    return;
  }

  const { error: errorDelete } = await supabase.from("alumnos").delete().eq("es_demo", true);
  if (errorDelete) throw errorDelete;

  console.log(`\n✓ ${alumnosDemo.length} alumnas demo y todo lo que colgaba de ellas fueron eliminadas.`);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
