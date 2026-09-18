#!/usr/bin/env node
// Script de uso puntual (no forma parte de la app en runtime) para armar una
// demo COMPLETA en la cuenta de "profe prueba" (utnfrlp54@gmail.com), la que
// el usuario va a usar para mostrarle el sistema en vivo a los profesores
// reales. A diferencia de cargar-alumnas-demo.mjs (que solo agregó ALUMNAS
// ficticias a clases YA EXISTENTES de Sabina/Laila, sin tocar el negocio),
// acá el usuario autorizó explícitamente CREAR clases demo nuevas para esta
// cuenta -- profe prueba solo tiene 1 clase real hoy y no alcanza para
// recorrer toda la vista Profesor en la reunión.
//
// Identidad verificada por ID antes de escribir nada (2026-09-18):
//   profiles.id = 8b8945b3-759c-44c1-a815-d47808bd7e2d
//   nombre="profe" apellido="prueba" email=utnfrlp54@gmail.com role=profesor
// Clase real de esta cuenta (NUNCA tocada por este script):
//   id b0bdbdbe-fc3a-4747-a46d-acdce0fe9e01 -- MUV FITNESS, Ritmo,
//   personalizada, martes 06:00-07:00, cupo 8 -- tiene anotado a Tomás
//   Terruli, el ÚNICO alumno real de todo el sistema. Por eso este script
//   jamás inserta inscripciones/asistencias en esta clase puntual: cualquier
//   fila demo ahí quedaría al lado del único dato 100% real que existe.
//
// Marca de demo: alumnos.es_demo (ya existía) + clases.es_demo (migración
// NUEVA 20260920090000_clases_demo_flag.sql -- tiene que estar aplicada
// ANTES de correr esto con --confirm). Igual que con alumnas, todo lo que
// cuelga de una clase demo (inscripciones/asistencias/planificaciones
// grupales) se identifica por transitividad vía clase_id -- no hace falta
// duplicar el flag ahí.
//
// Planificación SOLO donde corresponde según la actividad real (no se
// inventa ninguna regla nueva):
//   - Pilates: profe prueba no da Pilates, no aplica.
//   - Postural: la migración 20260906090000_identidad_alumnas.sql reapuntó
//     planificaciones.alumno_id a alumnos.id (ya no a profile_id) -- una
//     alumna demo (profile_id=null) SÍ puede tener planificación individual
//     real, no es un caso especial. Se crea una clase demo de Postural en
//     modalidad "personalizada" (así es como el propio schema documenta que
//     una planificación pertenece al alumno, no a la clase) con
//     planificación individual ESTRUCTURADA para 2 de sus 3 alumnas -- la
//     tercera queda sin planificación a propósito, para poder mostrar en
//     vivo el flujo de "crear planificación" durante la reunión.
//   - Otras actividades (Fuerza, Stretching): no se les carga planificación
//     -- "depende de su configuración", no confirmado, no se inventa.
//
// NO crea ninguna cuenta de Auth (profile_id de toda alumna demo queda
// NULL). NO modifica la clase real ni sus inscripciones/asistencias. NO
// toca ninguna sede/actividad real -- solo LEE esas tablas.
//
// Uso:
//   node scripts/cargar-demo-profe-prueba.mjs            -- preview (dry run)
//   node scripts/cargar-demo-profe-prueba.mjs --confirm   -- carga real

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

const PROFE_PRUEBA_ID = "8b8945b3-759c-44c1-a815-d47808bd7e2d";
const CLASE_REAL_ID = "b0bdbdbe-fc3a-4747-a46d-acdce0fe9e01";

const SEDE_FITNESS = "632d6240-1338-4d25-bc01-99cbfe683a33";
const SEDE_POSTURAL = "ea0402b5-d2f1-4b04-8de4-df4674855541";
const ACTIVIDAD_FUERZA = "e692083c-9802-47e5-b1ae-da6a869d9086";
const ACTIVIDAD_STRETCHING = "3bcd0993-fc7e-4009-bb71-9bec6912df96";
const ACTIVIDAD_POSTURAL = "2ff4706d-7681-4cd8-b19c-05cea3f2cd13";

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260920);
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const NOMBRES = [
  "Sofía", "Martina", "Juana", "Rocío", "Ludmila", "Agostina", "Milena", "Elena", "Carla", "Lara",
  "Dana", "Tamara", "Yésica", "Vanina", "Estefanía", "Ayelén", "Mailén", "Sabrina", "Karen", "Erica",
];
const APELLIDOS = [
  "Ávalos", "Britos", "Cañete", "Duarte", "Espínola", "Frías", "Giménez", "Herrera", "Insaurralde",
  "Jara", "Klein", "Leiva", "Mansilla", "Núñez", "Ovando", "Pereyra", "Quinteros", "Roldán", "Sosa", "Torres",
];
const usados = new Set();
function nombreUnico() {
  let intento = 0;
  while (true) {
    const nombre = pick(NOMBRES);
    const apellido = pick(APELLIDOS);
    const clave = `${nombre} ${apellido}`;
    if (!usados.has(clave) || intento++ > 500) {
      usados.add(clave);
      return { nombre, apellido };
    }
  }
}

function ultimasOcurrencias(diaSemanaIso, cantidad, hoy = new Date()) {
  const fechas = [];
  const cursor = new Date(hoy);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - 1);
  while (fechas.length < cantidad) {
    const diaIso = cursor.getDay() === 0 ? 7 : cursor.getDay();
    if (diaIso === diaSemanaIso) {
      fechas.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return fechas;
}

const OBSERVACIONES = [
  "Refiere leve molestia lumbar al finalizar la jornada laboral, sin irradiación.",
  "Sin dolores actuales. Objetivo: mejorar postura general y fuerza de core.",
  "Molestia intermitente en cervicales, asociada a trabajo frente a PC.",
  "Buena movilidad general, viene de sedentarismo -- progresar de a poco.",
  "",
];
const CATEGORIAS = ["seguimiento_general", "molestia_dolor", "mejora_progreso", "adaptacion"];
const NOTAS_EJEMPLO = {
  seguimiento_general: "Buena adaptación a la clase, sigue el ritmo grupal sin dificultad.",
  molestia_dolor: "Refirió molestia leve en zona lumbar durante el ejercicio -- se adaptó la posición.",
  mejora_progreso: "Notable mejora en el control postural respecto de las primeras clases.",
  adaptacion: "Se ajustó la intensidad del ejercicio por indicación propia.",
};

async function main() {
  console.log(CONFIRMAR ? "MODO: carga real (--confirm)" : "MODO: preview (dry run) -- no se escribe nada todavía");

  // -------------------------------------------------------------------------
  // 0) Verificación de identidad -- nunca escribir sin confirmar que ESTE id
  // es de verdad "profe prueba" y no otra profesora.
  // -------------------------------------------------------------------------
  const { data: perfil, error: errorPerfil } = await supabase
    .from("profiles")
    .select("id, nombre, apellido, email, role")
    .eq("id", PROFE_PRUEBA_ID)
    .single();
  if (errorPerfil || !perfil) throw new Error("No se encontró el perfil de profe prueba -- abortando.");
  if (perfil.nombre !== "profe" || perfil.apellido !== "prueba" || perfil.email !== "utnfrlp54@gmail.com" || perfil.role !== "profesor") {
    throw new Error(`El perfil ${PROFE_PRUEBA_ID} no coincide con "profe prueba" -- abortando. Encontrado: ${JSON.stringify(perfil)}`);
  }
  console.log(`✓ Identidad verificada: ${perfil.nombre} ${perfil.apellido} <${perfil.email}> (${perfil.id})`);

  const { data: claseReal, error: errorClaseReal } = await supabase.from("clases").select("*").eq("id", CLASE_REAL_ID).single();
  if (errorClaseReal || !claseReal || claseReal.profesor_id !== PROFE_PRUEBA_ID) {
    throw new Error("La clase real esperada de profe prueba no coincide -- abortando.");
  }
  console.log(`✓ Clase real de profe prueba confirmada (no se toca): dia ${claseReal.dia_semana} ${claseReal.hora_inicio}-${claseReal.hora_fin}, cupo ${claseReal.cupo}`);

  // -------------------------------------------------------------------------
  // 1) Definición de las 3 clases demo nuevas -- días/horarios que no chocan
  // con la clase real (martes 06-07) ni entre sí.
  // -------------------------------------------------------------------------
  const clasesDemoSpec = [
    { key: "full", sede_id: SEDE_FITNESS, actividad_id: ACTIVIDAD_FUERZA, dia_semana: 3, hora_inicio: "10:00:00", hora_fin: "11:00:00", cupo: 6, modalidad: "grupal", target: 6, label: "MUV FITNESS / Fuerza, miércoles 10-11 (LLENA)" },
    { key: "parcial", sede_id: SEDE_POSTURAL, actividad_id: ACTIVIDAD_POSTURAL, dia_semana: 4, hora_inicio: "09:00:00", hora_fin: "10:00:00", cupo: 8, modalidad: "personalizada", target: 3, label: "MUV POSTURAL / Postural, jueves 09-10 (PARCIAL + planificación individual)" },
    { key: "vacia", sede_id: SEDE_FITNESS, actividad_id: ACTIVIDAD_STRETCHING, dia_semana: 5, hora_inicio: "07:00:00", hora_fin: "08:00:00", cupo: 5, modalidad: "grupal", target: 0, label: "MUV FITNESS / Stretching, viernes 07-08 (VACÍA)" },
  ];

  for (const c of clasesDemoSpec) {
    if (c.target > c.cupo) throw new Error(`Target ${c.target} supera el cupo ${c.cupo} de ${c.key} -- revisar antes de --confirm`);
  }

  console.log("\n=== Clases demo a crear ===");
  for (const c of clasesDemoSpec) console.log(`  ${c.label} -- ${c.target}/${c.cupo} alumnas`);

  const totalAlumnas = clasesDemoSpec.reduce((s, c) => s + c.target, 0);
  console.log(`\nTotal de alumnas demo a crear: ${totalAlumnas}`);
  console.log(`Total de inscripciones a crear: ${totalAlumnas}`);
  console.log(`Planificación individual: 2 de las 3 alumnas de la clase Postural (la 3ra queda sin planificación a propósito).`);

  if (!CONFIRMAR) {
    console.log("\nEsto fue un preview -- no se escribió nada. Volvé a correr con --confirm para ejecutar de verdad.");
    return;
  }

  // -------------------------------------------------------------------------
  // 2) Crear las clases demo.
  // -------------------------------------------------------------------------
  const filasClases = clasesDemoSpec.map((c) => ({
    sede_id: c.sede_id,
    profesor_id: PROFE_PRUEBA_ID,
    actividad_id: c.actividad_id,
    dia_semana: c.dia_semana,
    hora_inicio: c.hora_inicio,
    hora_fin: c.hora_fin,
    cupo: c.cupo,
    modalidad: c.modalidad,
    es_demo: true,
  }));
  const { data: clasesCreadas, error: errorClases } = await supabase.from("clases").insert(filasClases).select("id");
  if (errorClases) throw errorClases;
  clasesDemoSpec.forEach((c, i) => (c.id = clasesCreadas[i].id));
  console.log(`✓ ${clasesCreadas.length} clases demo creadas (clases.es_demo=true)`);

  const claseFull = clasesDemoSpec.find((c) => c.key === "full");
  const clasePostural = clasesDemoSpec.find((c) => c.key === "parcial");
  // La clase "vacía" no necesita ninguna alumna -- queda tal cual.

  // -------------------------------------------------------------------------
  // 3) Alumnas demo + pagos mínimos (mismo criterio ya usado y aprobado:
  // estado='aprobado', monto=1, sin comprobante -- excluido de facturación
  // real en lib/admin/dashboard-data.ts) + inscripciones.
  // -------------------------------------------------------------------------
  const alumnasFull = Array.from({ length: claseFull.target }, () => ({ info: nombreUnico() }));
  const alumnasPostural = Array.from({ length: clasePostural.target }, () => ({ info: nombreUnico() }));
  const todasLasAlumnas = [...alumnasFull, ...alumnasPostural];

  const filasAlumnos = todasLasAlumnas.map((a) => ({
    nombre: a.info.nombre,
    apellido: a.info.apellido,
    email: null,
    telefono: null,
    es_demo: true,
  }));
  const { data: alumnosCreados, error: errorAlumnos } = await supabase.from("alumnos").insert(filasAlumnos).select("id");
  if (errorAlumnos) throw errorAlumnos;
  todasLasAlumnas.forEach((a, i) => (a.id = alumnosCreados[i].id));
  console.log(`✓ ${alumnosCreados.length} alumnas demo creadas`);

  const filasPagos = [
    ...alumnasFull.map((a) => ({ alumno_id: a.id, sede_id: SEDE_FITNESS, frecuencia_semanal: 1, monto: 1, medio: "efectivo", estado: "aprobado" })),
    ...alumnasPostural.map((a) => ({ alumno_id: a.id, sede_id: SEDE_POSTURAL, frecuencia_semanal: 1, monto: 1, medio: "efectivo", estado: "aprobado" })),
  ];
  const { error: errorPagos } = await supabase.from("pagos").insert(filasPagos);
  if (errorPagos) throw errorPagos;
  console.log(`✓ ${filasPagos.length} pagos demo mínimos creados (requeridos por el trigger para poder marcar "presente")`);

  const filasInscripciones = [
    ...alumnasFull.map((a) => ({ alumno_id: a.id, clase_id: claseFull.id, estado: "activa" })),
    ...alumnasPostural.map((a) => ({ alumno_id: a.id, clase_id: clasePostural.id, estado: "activa" })),
  ];
  const { error: errorInsc } = await supabase.from("inscripciones").insert(filasInscripciones);
  if (errorInsc) throw errorInsc;
  console.log(`✓ ${filasInscripciones.length} inscripciones creadas`);

  // -------------------------------------------------------------------------
  // 4) Asistencias históricas (últimas 4 ocurrencias de cada clase demo con
  // alumnas) -- mezcla de presentes/ausentes, mismo criterio que la carga de
  // Sabina/Laila.
  // -------------------------------------------------------------------------
  const filasAsistencias = [];
  for (const [clase, alumnas] of [[claseFull, alumnasFull], [clasePostural, alumnasPostural]]) {
    const fechas = ultimasOcurrencias(clase.dia_semana, 4);
    for (const a of alumnas) {
      for (const fecha of fechas) {
        if (rand() < 0.1) continue;
        const presente = rand() < 0.8;
        filasAsistencias.push({
          clase_id: clase.id,
          alumno_id: a.id,
          fecha,
          estado: presente ? "presente" : "ausente",
          tomado_por: PROFE_PRUEBA_ID,
          tomado_en: `${fecha}T${clase.hora_fin}`,
        });
      }
    }
  }
  const { error: errorAsist } = await supabase.from("asistencias").insert(filasAsistencias);
  if (errorAsist) throw errorAsist;
  console.log(`✓ ${filasAsistencias.length} asistencias históricas creadas (presentes y ausentes)`);

  // -------------------------------------------------------------------------
  // 5) Fichas, pruebas funcionales y notas de evolución -- distribuidas
  // (no todas las alumnas tienen de todo, a propósito, para mostrar variedad).
  // -------------------------------------------------------------------------
  let fichasCreadas = 0;
  let pruebasCreadas = 0;
  let notasCreadas = 0;

  for (const a of todasLasAlumnas) {
    const tieneFicha = rand() < 0.6; // proporción alta -- pocas alumnas, se quiere mostrar bien la función
    if (tieneFicha) {
      const completa = rand() < 0.6;
      const { error } = await supabase.from("fichas_evaluacion").insert({
        alumno_id: a.id,
        observaciones_iniciales: pick(OBSERVACIONES),
        profesional_evaluador_id: PROFE_PRUEBA_ID,
        actualizado_por: PROFE_PRUEBA_ID,
        edad: randInt(22, 55),
        ...(completa
          ? {
              actividad_fisica_previa: pick(["Sedentaria", "Caminatas ocasionales", "Yoga", "Ninguna", "Running recreativo"]),
              dolor_actual: randInt(1, 4),
              objetivo_1: pick(["Mejorar postura", "Reducir dolor de espalda", "Ganar fuerza", "Bienestar general"]),
              dias_posibles: [2, 3, 4],
              turnos_posibles: ["manana"],
            }
          : {}),
      });
      if (error) throw error;
      fichasCreadas++;

      if (rand() < 0.5) {
        const { error: errorPrueba } = await supabase.from("ficha_evaluacion_pruebas_funcionales").insert({
          alumno_id: a.id,
          es_inicial: true,
          autor_id: PROFE_PRUEBA_ID,
          flexion_tronco_resultado: pick(["Toca punta de pies", "A media pierna", "Toca el piso"]),
          equilibrio_cerrados_derecha_seg: randInt(5, 30),
          equilibrio_cerrados_izquierda_seg: randInt(5, 30),
          observaciones_generales: "Evaluación inicial dentro de parámetros esperados para su edad y actividad previa.",
        });
        if (errorPrueba) throw errorPrueba;
        pruebasCreadas++;
      }
    }

    if (rand() < 0.5) {
      const cantidadNotas = randInt(1, 2);
      const fechasNotas = Array.from({ length: cantidadNotas }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (i + 1) * randInt(10, 16));
        return d.toISOString().slice(0, 10);
      });
      const filasNotas = fechasNotas.map((fecha) => {
        const categoria = pick(CATEGORIAS);
        return { alumno_id: a.id, autor_id: PROFE_PRUEBA_ID, contenido: NOTAS_EJEMPLO[categoria], categoria, fecha };
      });
      const { error } = await supabase.from("ficha_evaluacion_notas").insert(filasNotas);
      if (error) throw error;
      notasCreadas += filasNotas.length;
    }
  }
  console.log(`✓ ${fichasCreadas} fichas de evaluación, ${pruebasCreadas} pruebas funcionales, ${notasCreadas} notas de evolución creadas`);

  // -------------------------------------------------------------------------
  // 6) Planificación individual ESTRUCTURADA para 2 de las 3 alumnas de la
  // clase Postural (la 3ra queda sin planificación a propósito -- para poder
  // mostrar en vivo el flujo de "crear planificación" durante la reunión).
  // Postural es la única actividad de profe prueba donde el negocio confirmó
  // que corresponde planificación individual -- no se crea para Fuerza ni
  // Stretching (no está confirmado, no se inventa).
  // -------------------------------------------------------------------------
  const alumnasConPlanificacion = alumnasPostural.slice(0, 2);
  let planificacionesCreadas = 0;

  for (const a of alumnasConPlanificacion) {
    const { data: plan, error: errorPlan } = await supabase
      .from("planificaciones")
      .insert({
        tipo: "individual",
        alumno_id: a.id,
        es_actual: true,
        version: 1,
        creado_por: PROFE_PRUEBA_ID,
        titulo: "Plan postural inicial",
        objetivo_general: "Mejorar postura general y aliviar tensiones -- progresión gradual.",
        formato: "estructurada",
      })
      .select("id")
      .single();
    if (errorPlan) throw errorPlan;

    const { data: dia, error: errorDia } = await supabase
      .from("planificacion_dias")
      .insert({ planificacion_id: plan.id, nombre: "Día 1", estiramientos: "Rotadores, isquiotibiales, rodillo", orden: 0 })
      .select("id")
      .single();
    if (errorDia) throw errorDia;

    const { data: bloque, error: errorBloque } = await supabase
      .from("planificacion_bloques")
      .insert({ planificacion_id: plan.id, dia_id: dia.id, nombre: "Acondicionamiento", orden: 0 })
      .select("id")
      .single();
    if (errorBloque) throw errorBloque;

    const ejerciciosDemo = ["Elongación cervical", "Plancha abdominal", "Puente de glúteos"];
    for (let i = 0; i < ejerciciosDemo.length; i++) {
      const { data: ejercicio, error: errorEj } = await supabase
        .from("planificacion_ejercicios")
        .insert({ planificacion_id: plan.id, bloque_id: bloque.id, nombre: ejerciciosDemo[i], orden: i })
        .select("id")
        .single();
      if (errorEj) throw errorEj;

      const { error: errorSemana } = await supabase.from("planificacion_ejercicio_semanas").insert({
        planificacion_id: plan.id,
        ejercicio_id: ejercicio.id,
        numero_semana: 1,
        series: "3",
        repeticiones: "12",
        tiempo: null,
        pse: "moderado",
        observaciones: null,
      });
      if (errorSemana) throw errorSemana;
    }

    planificacionesCreadas++;
  }
  console.log(`✓ ${planificacionesCreadas} planificaciones individuales estructuradas creadas (clase Postural)`);

  console.log("\nListo. Todo lo creado tiene clases.es_demo=true y/o alumnos.es_demo=true.");
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
