#!/usr/bin/env node
// Script de uso puntual (no forma parte de la app en runtime) para borrar
// DEFINITIVAMENTE de Supabase Auth a los dos profesores demo confirmados:
// Bruno Álvarez y Carla Medina.
//
// Por qué un script aparte y no la migración SQL: borrar un usuario de
// auth.users con un DELETE directo por SQL salta el bookkeeping interno de
// Supabase Auth (identities, sesiones, refresh tokens) -- la forma
// oficial/soportada es admin.auth.admin.deleteUser(), la misma que ya usa
// eliminarProfesor() en lib/admin/profesores-actions.ts.
//
// Requisito de orden: correr esto DESPUÉS de aplicar la migración
// 20260908090000_elimina_concepto_inactivo.sql -- esa migración borra las 7
// clases que tenían asignadas (4 de Bruno, 3 de Carla). Sin eso, borrar su
// usuario de Auth fallaría al cascadear a la fila de "profesores"
// (clases.profesor_id es "on delete restrict").
//
// Al borrar el usuario de Auth, profiles y profesores se borran solos en
// cascada (profiles.id -> auth.users, profesores.profile_id -> profiles.id,
// ambos "on delete cascade") -- no hace falta ningún DELETE manual aparte.
//
// Corre local, con tus credenciales reales de .env.local. Requiere
// NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
//
// Uso:
//   node scripts/eliminar-profesores-demo.mjs            -- solo preview (dry run), no borra nada
//   node scripts/eliminar-profesores-demo.mjs --confirm   -- ejecuta el borrado

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

// IDs verificados por inspección directa de la base (2026-09-07) -- se
// identifican por ID exacto, nunca por coincidencia de nombre.
const DEMO_PROFESORES = [
  { id: "25c86096-7af9-47b2-a08c-e465a2a98430", nombre: "Bruno Álvarez" },
  { id: "b689bb29-1249-4974-93f4-2e190f53e42b", nombre: "Carla Medina" },
];

const confirmar = process.argv.includes("--confirm");

async function main() {
  console.log(confirmar ? "MODO: borrado real (--confirm)" : "MODO: preview (dry run) -- no se borra nada todavía");
  console.log("");

  for (const p of DEMO_PROFESORES) {
    const { count: clasesCount } = await supabase
      .from("clases")
      .select("id", { count: "exact", head: true })
      .eq("profesor_id", p.id);

    if (clasesCount && clasesCount > 0) {
      console.error(
        `✗ ${p.nombre} (${p.id}) todavía tiene ${clasesCount} clase(s) asignada(s) -- aplicá primero la migración 20260908090000_elimina_concepto_inactivo.sql antes de correr este script.`,
      );
      continue;
    }

    if (!confirmar) {
      console.log(`  Se borraría: ${p.nombre} (${p.id}) -- sin clases asignadas, listo para borrar.`);
      continue;
    }

    const { error } = await supabase.auth.admin.deleteUser(p.id);
    if (error) {
      console.error(`✗ Error borrando a ${p.nombre} (${p.id}):`, error.message);
    } else {
      console.log(`✓ ${p.nombre} (${p.id}) eliminado de Auth (profiles/profesores se borraron solos en cascada).`);
    }
  }

  if (!confirmar) {
    console.log("\nRevisá el preview de arriba y volvé a correr con --confirm para ejecutar el borrado real.");
  }
}

main();
