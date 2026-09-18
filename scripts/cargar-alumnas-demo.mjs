#!/usr/bin/env node
// Script de uso puntual (no forma parte de la app en runtime) para cargar
// alumnas FICTICIAS en las clases reales de los profesores que ya tienen
// cuenta (Sabina Bocca, Laila Casin) -- para poder mostrarles el sistema
// funcionando antes de cargar alumnas reales.
//
// Requisitos ya verificados antes de escribir esto (auditoría de solo
// lectura en producción):
//   - Sabina: 21 clases, todas Pilates en MUV PILATES, cupo 6 -- Pilates NO
//     usa planificación (regla de negocio), así que a sus alumnas demo no
//     se les carga ninguna.
//   - Laila: 5 clases (2 en MUV POSTURAL cupo 7, 3 en MUV FITNESS cupo 12)
//     -- ninguna tiene actividad_id/modalidad clasificada todavía, así que
//     tampoco se les carga planificación (no se inventa a qué actividad
//     puntual corresponde cada una -- eso lo completa la administración a
//     mano cuando corresponda, ver clase-form.tsx).
//   - Laura Pagola tiene cuenta pero CERO clases asignadas hoy -- no hay
//     nada que poblarle sin inventar una clase, así que no aparece acá.
//   - "profe prueba" (utnfrlp54@gmail.com) no se considera profesor real de
//     MUV (cuenta de prueba, confirmado con la administración) -- no se le
//     carga nada.
//   - Los otros 14 profesores reales (Rocío, Gabriela, etc.) todavía no
//     tienen cuenta -- no pueden entrar a la reunión, así que sus 73 clases
//     quedan fuera de esta carga (decisión explícita, no un olvido).
//
// Marca de demo: alumnos.es_demo = true (columna nueva, ver migración
// 20260919090000_alumnas_demo_flag.sql -- tiene que estar aplicada ANTES de
// correr este script con --confirm, si no cada alumna demo quedaría
// invisible para los profesores por fn_alumno_visible()).
//
// NO crea ningún pago -- fn_alumno_visible() ya trata a toda alumna
// es_demo=true como visible sin necesitar ninguno (ver la migración de
// arriba). Cero riesgo de tocar facturación real.
// NO crea ninguna cuenta de Auth -- profile_id siempre queda NULL.
// NO toca ninguna clase/profesor/sede/actividad/cupo real -- solo LEE esas
// tablas para saber dónde inscribir a las alumnas demo.
// NO crea planificaciones (ver motivo arriba) ni sube ningún archivo a Storage.
//
// Respeta los mismos triggers que protegen cualquier alta real (límite de
// 4 clases/semana por sede, solapamiento de horario, cupo máximo) -- si el
// script tuviera un bug que los violara, la base los rechazaría igual que
// a cualquier otro insert.
//
// Uso:
//   node scripts/cargar-alumnas-demo.mjs            -- preview (dry run), no escribe nada
//   node scripts/cargar-alumnas-demo.mjs --confirm   -- ejecuta la carga real

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

// IDs verificados por inspección directa de la base (2026-09-18).
const SABINA_ID = "b08124f5-9a7d-4021-8091-56e9623050f3";
const LAILA_ID = "d019aac1-68a1-42c7-b471-e0da45876313";

// ---------------------------------------------------------------------------
// PRNG determinístico (mulberry32) -- misma semilla siempre da la misma
// distribución, así el preview (dry run) muestra EXACTAMENTE lo que después
// va a escribir --confirm, sin sorpresas entre una corrida y otra.
// ---------------------------------------------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260919);
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Nombres ficticios argentinos, naturales -- ninguno coincide con personas
// reales ya cargadas en el sistema (profesoras, alumnas, o nombres de
// profesores pendientes de cuenta), verificado a mano contra la auditoría.
// ---------------------------------------------------------------------------
const NOMBRES = [
  "Valentina", "Camila", "Julieta", "Agustina", "Florencia", "Micaela", "Antonella", "Milagros",
  "Catalina", "Delfina", "Abril", "Renata", "Victoria", "Emilia", "Lucía", "Bianca", "Zoe", "Alma",
  "Josefina", "Malena", "Ornella", "Guadalupe", "Candela", "Morena", "Constanza", "Paula", "Daniela",
  "Brenda", "Yamila", "Noelia", "Melina", "Belén", "Marina", "Lorena", "Ivana", "Celeste", "Romina",
  "Cecilia", "Gisela", "Natalia",
];
const APELLIDOS = [
  "Ferreyra", "Aguirre", "Molina", "Acosta", "Suárez", "Domínguez", "Ibáñez", "Cabral", "Rojas",
  "Godoy", "Farías", "Ledesma", "Quiroga", "Paz", "Benítez", "Villalba", "Cardozo", "Escobar",
  "Maldonado", "Bustos", "Arias", "Correa", "Peralta", "Toledo", "Ojeda", "Vega", "Juárez", "Ríos",
  "Lucero", "Chávez", "Bazán", "Coronel", "Medrano", "Zalazar", "Barrios", "Funes", "Salinas",
  "Palacios", "Guerrero", "Fernández",
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

const DIAS_ISO = { 1: "lunes", 2: "martes", 3: "miércoles", 4: "jueves", 5: "viernes", 6: "sábado", 7: "domingo" };

// Últimas N ocurrencias PASADAS de dia_semana (ISO 1=lunes..7=domingo),
// estrictamente antes de hoy -- para generar historial de asistencia real.
function ultimasOcurrencias(diaSemanaIso, cantidad, hoy = new Date()) {
  const fechas = [];
  const cursor = new Date(hoy);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - 1); // empieza ayer, nunca hoy/futuro
  while (fechas.length < cantidad) {
    const diaIso = cursor.getDay() === 0 ? 7 : cursor.getDay();
    if (diaIso === diaSemanaIso) {
      fechas.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return fechas;
}

// ---------------------------------------------------------------------------
// 1) Leer clases reales de Sabina y Laila (solo lectura).
// ---------------------------------------------------------------------------
async function leerClasesDe(profesorId) {
  const { data, error } = await supabase
    .from("clases")
    .select("id, sede_id, actividad_id, modalidad, dia_semana, hora_inicio, hora_fin, cupo")
    .eq("profesor_id", profesorId);
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// 2) Arma la lista de (alumna, clases[]) para un grupo de clases de UN
// profesor, respetando cupo y evitando que una misma alumna quede en dos
// clases con el mismo día+horario exacto (no puede pasar acá: distintas
// clases del mismo profesor nunca se superponen entre sí, ya lo garantiza
// el trigger real fn_validar_solapamiento_clase).
// ---------------------------------------------------------------------------
function armarAsignaciones(clases, targets) {
  // pool: alumna -> { info, clasesAsignadas: Set<claseId>, frecuenciaObjetivo }
  const pool = [];
  const asignacionesPorClase = new Map(clases.map((c) => [c.id, []]));

  const clasesConTarget = clases.map((c, i) => ({ ...c, target: targets[i] }));

  for (const c of clasesConTarget) {
    const asignados = asignacionesPorClase.get(c.id);
    while (asignados.length < c.target) {
      // Buscar alguien del pool que todavía no llegó a su frecuencia
      // objetivo y no esté ya en esta clase.
      const candidato = pool.find(
        (p) => p.clasesAsignadas.size < p.frecuenciaObjetivo && !p.clasesAsignadas.has(c.id),
      );
      let elegido = candidato;
      if (!elegido) {
        const frecuenciaObjetivo = rand() < 0.55 ? 1 : rand() < 0.72 ? 2 : 3; // ~55% 1x, ~30% 2x, ~15% 3x
        elegido = { info: nombreUnico(), clasesAsignadas: new Set(), frecuenciaObjetivo };
        pool.push(elegido);
      }
      elegido.clasesAsignadas.add(c.id);
      asignados.push(elegido);
    }
  }

  return { pool, asignacionesPorClase, clasesConTarget };
}

async function main() {
  console.log(CONFIRMAR ? "MODO: carga real (--confirm)" : "MODO: preview (dry run) -- no se escribe nada todavía");

  const [clasesSabina, clasesLaila] = await Promise.all([leerClasesDe(SABINA_ID), leerClasesDe(LAILA_ID)]);
  if (clasesSabina.length !== 21) console.warn(`⚠ esperaba 21 clases de Sabina, encontré ${clasesSabina.length} -- revisá antes de --confirm`);
  if (clasesLaila.length !== 5) console.warn(`⚠ esperaba 5 clases de Laila, encontré ${clasesLaila.length} -- revisá antes de --confirm`);

  // Orden estable (día, hora) y targets fijos por posición -- variedad real
  // (llenas, casi llenas, medias, bajas, una en 0) sin superar nunca el cupo.
  const ordenar = (a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio);
  clasesSabina.sort(ordenar);
  clasesLaila.sort(ordenar);

  const targetsSabina = [6, 6, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 1, 0].slice(0, clasesSabina.length);
  // Laila da clases en 2 sedes con cupos distintos (Postural=7, Fitness=12)
  // -- se separan por cupo en vez de por sede_id porque es lo que ya
  // verificamos que las distingue de forma inequívoca en esta base puntual.
  const claseLailaPostural = clasesLaila.filter((c) => c.cupo === 7);
  const claseLailaFitness = clasesLaila.filter((c) => c.cupo === 12);
  const targetsPostural = [6, 3].slice(0, claseLailaPostural.length);
  const targetsFitness = [12, 7, 1].slice(0, claseLailaFitness.length);

  const { pool: poolSabina, asignacionesPorClase: asigSabina, clasesConTarget: ctSabina } = armarAsignaciones(clasesSabina, targetsSabina);
  const { pool: poolPostural, asignacionesPorClase: asigPostural, clasesConTarget: ctPostural } = armarAsignaciones(claseLailaPostural, targetsPostural);
  const { pool: poolFitness, asignacionesPorClase: asigFitness, clasesConTarget: ctFitness } = armarAsignaciones(claseLailaFitness, targetsFitness);

  console.log("\n=== SABINA BOCCA -- MUV PILATES (Pilates, sin planificación) ===");
  for (const c of ctSabina) {
    console.log(`  dia ${DIAS_ISO[c.dia_semana]} ${c.hora_inicio.slice(0, 5)}-${c.hora_fin.slice(0, 5)}: ${asigSabina.get(c.id).length}/${c.cupo}`);
  }
  console.log(`  -> ${poolSabina.length} alumnas ficticias distintas`);

  console.log("\n=== LAILA CASIN -- MUV POSTURAL ===");
  for (const c of ctPostural) {
    console.log(`  dia ${DIAS_ISO[c.dia_semana]} ${c.hora_inicio.slice(0, 5)}-${c.hora_fin.slice(0, 5)}: ${asigPostural.get(c.id).length}/${c.cupo}`);
  }
  console.log(`  -> ${poolPostural.length} alumnas ficticias distintas`);

  console.log("\n=== LAILA CASIN -- MUV FITNESS ===");
  for (const c of ctFitness) {
    console.log(`  dia ${DIAS_ISO[c.dia_semana]} ${c.hora_inicio.slice(0, 5)}-${c.hora_fin.slice(0, 5)}: ${asigFitness.get(c.id).length}/${c.cupo}`);
  }
  console.log(`  -> ${poolFitness.length} alumnas ficticias distintas`);

  const todasLasAlumnas = [...poolSabina, ...poolPostural, ...poolFitness];
  console.log(`\nTotal de alumnas ficticias a crear: ${todasLasAlumnas.length}`);
  console.log(`Total de inscripciones a crear: ${todasLasAlumnas.reduce((s, a) => s + a.clasesAsignadas.size, 0)}`);

  if (!CONFIRMAR) {
    console.log("\nEsto fue un preview -- no se escribió nada. Volvé a correr con --confirm para ejecutar de verdad.");
    return;
  }

  // -------------------------------------------------------------------------
  // 3) Escritura real -- alumnos (es_demo=true, profile_id=null).
  // -------------------------------------------------------------------------
  const filasAlumnos = todasLasAlumnas.map((a) => ({
    nombre: a.info.nombre,
    apellido: a.info.apellido,
    email: null,
    telefono: null,
    es_demo: true,
  }));
  const { data: alumnosCreados, error: errorAlumnos } = await supabase.from("alumnos").insert(filasAlumnos).select("id, nombre, apellido");
  if (errorAlumnos) throw errorAlumnos;
  console.log(`✓ ${alumnosCreados.length} alumnas demo creadas`);

  // Vincular cada fila creada de vuelta a su objeto en memoria (mismo orden
  // de inserción que filasAlumnos/todasLasAlumnas).
  todasLasAlumnas.forEach((a, i) => {
    a.id = alumnosCreados[i].id;
  });

  // -------------------------------------------------------------------------
  // 4) Pagos + inscripciones + asistencias, por cada grupo.
  //
  // Pago mínimo por alumna (no por sede, este script nunca mezcla sedes
  // para la misma alumna demo): existe SOLO para satisfacer
  // fn_validar_cuota_para_asistencia (exige un pago aprobado y vigente en
  // esa sede antes de poder marcar "presente" -- "ausente" no lo necesita,
  // pero se crea igual para todas para no dejar el estado de cuota
  // inconsistente). estado='aprobado' sin comprobante_url (nunca aparece en
  // la cola de comprobantes pendientes) y monto=1 (valor claramente no real
  // -- de cualquier forma queda excluido de facturación/cuotas vencidas del
  // dashboard admin, ver lib/admin/dashboard-data.ts).
  // -------------------------------------------------------------------------
  async function cargarGrupo(nombreGrupo, asignacionesPorClase, clasesConTarget, profesorId, sedeId, pool) {
    if (pool.length === 0) return;

    const filasPagos = pool.map((a) => ({
      alumno_id: a.id,
      sede_id: sedeId,
      frecuencia_semanal: Math.min(4, Math.max(1, a.clasesAsignadas.size)),
      monto: 1,
      medio: "efectivo",
      estado: "aprobado",
    }));
    const { error: errorPagos } = await supabase.from("pagos").insert(filasPagos);
    if (errorPagos) throw errorPagos;
    console.log(`✓ [${nombreGrupo}] ${filasPagos.length} pagos demo mínimos creados (cuota al día, requerido por la base para poder marcar "presente")`);

    const filasInscripciones = [];
    for (const [claseId, alumnas] of asignacionesPorClase) {
      for (const a of alumnas) {
        filasInscripciones.push({ alumno_id: a.id, clase_id: claseId, estado: "activa" });
      }
    }
    if (filasInscripciones.length === 0) return;

    const { error: errorInsc } = await supabase.from("inscripciones").insert(filasInscripciones);
    if (errorInsc) throw errorInsc;
    console.log(`✓ [${nombreGrupo}] ${filasInscripciones.length} inscripciones creadas`);

    const filasAsistencias = [];
    for (const c of clasesConTarget) {
      const alumnasDeEstaClase = asignacionesPorClase.get(c.id);
      const fechas = ultimasOcurrencias(c.dia_semana, 4);
      for (const a of alumnasDeEstaClase) {
        for (const fecha of fechas) {
          if (rand() < 0.1) continue; // ~10% de las clases pasadas queda sin marcar (realista)
          const presente = rand() < 0.8;
          filasAsistencias.push({
            clase_id: c.id,
            alumno_id: a.id,
            fecha,
            estado: presente ? "presente" : "ausente",
            tomado_por: profesorId,
            tomado_en: `${fecha}T${c.hora_fin}`,
          });
        }
      }
    }
    if (filasAsistencias.length > 0) {
      const { error: errorAsist } = await supabase.from("asistencias").insert(filasAsistencias);
      if (errorAsist) throw errorAsist;
      console.log(`✓ [${nombreGrupo}] ${filasAsistencias.length} asistencias históricas creadas`);
    }
  }

  await cargarGrupo("Sabina/Pilates", asigSabina, ctSabina, SABINA_ID, clasesSabina[0].sede_id, poolSabina);
  await cargarGrupo("Laila/Postural", asigPostural, ctPostural, LAILA_ID, claseLailaPostural[0].sede_id, poolPostural);
  await cargarGrupo("Laila/Fitness", asigFitness, ctFitness, LAILA_ID, claseLailaFitness[0].sede_id, poolFitness);

  // -------------------------------------------------------------------------
  // 5) Fichas, pruebas funcionales y evoluciones -- distribuidas para poder
  // mostrar cada función (no todas las alumnas tienen de todo, a propósito).
  // -------------------------------------------------------------------------
  const profesorPorAlumna = new Map();
  for (const a of poolSabina) profesorPorAlumna.set(a.id, SABINA_ID);
  for (const a of [...poolPostural, ...poolFitness]) profesorPorAlumna.set(a.id, LAILA_ID);

  const OBSERVACIONES = [
    "Refiere leve molestia lumbar al finalizar la jornada laboral, sin irradiación.",
    "Sin dolores actuales. Objetivo: mejorar postura general y fuerza de core.",
    "Molestia intermitente en cervicales, asociada a trabajo frente a PC.",
    "Buena movilidad general, viene de sedentarismo -- progresar de a poco.",
    "Antecedente de esguince de tobillo hace 2 años, ya recuperado.",
    "",
  ];
  const CATEGORIAS = ["seguimiento_general", "molestia_dolor", "mejora_progreso", "adaptacion"];
  const NOTAS_EJEMPLO = {
    seguimiento_general: "Buena adaptación a la clase, sigue el ritmo grupal sin dificultad.",
    molestia_dolor: "Refirió molestia leve en zona lumbar durante el ejercicio -- se adaptó la posición.",
    mejora_progreso: "Notable mejora en el control postural respecto de las primeras clases.",
    adaptacion: "Se ajustó la intensidad del ejercicio por indicación propia.",
  };

  let fichasCreadas = 0;
  let pruebasCreadas = 0;
  let notasCreadas = 0;

  for (const a of todasLasAlumnas) {
    const profesorId = profesorPorAlumna.get(a.id);
    const tieneFicha = rand() < 0.35;
    if (tieneFicha) {
      const completa = rand() < 0.4;
      const { error } = await supabase.from("fichas_evaluacion").insert({
        alumno_id: a.id,
        observaciones_iniciales: pick(OBSERVACIONES),
        profesional_evaluador_id: profesorId,
        actualizado_por: profesorId,
        edad: randInt(22, 58),
        ...(completa
          ? {
              actividad_fisica_previa: pick(["Sedentaria", "Caminatas ocasionales", "Yoga", "Ninguna", "Running recreativo"]),
              dolor_actual: randInt(1, 4),
              objetivo_1: pick(["Mejorar postura", "Reducir dolor de espalda", "Ganar fuerza", "Bienestar general"]),
              dias_posibles: shuffle([1, 2, 3, 4, 5]).slice(0, randInt(2, 4)).sort((x, y) => x - y),
              turnos_posibles: shuffle(["manana", "tarde", "noche"]).slice(0, randInt(1, 2)),
            }
          : {}),
      });
      if (error) throw error;
      fichasCreadas++;

      if (rand() < 0.5) {
        const { error: errorPrueba } = await supabase.from("ficha_evaluacion_pruebas_funcionales").insert({
          alumno_id: a.id,
          es_inicial: true,
          autor_id: profesorId,
          flexion_tronco_resultado: pick(["Toca punta de pies", "A media pierna", "Toca el piso"]),
          equilibrio_cerrados_derecha_seg: randInt(5, 30),
          equilibrio_cerrados_izquierda_seg: randInt(5, 30),
          observaciones_generales: "Evaluación inicial dentro de parámetros esperados para su edad y actividad previa.",
        });
        if (errorPrueba) throw errorPrueba;
        pruebasCreadas++;
      }
    }

    if (rand() < 0.4) {
      const cantidadNotas = randInt(1, 3);
      // Una nota cada ~12-18 días hacia atrás desde hoy -- alcanza para
      // mostrar una línea de tiempo con espaciado realista, sin atarla a
      // ningún día de clase puntual.
      const fechasNotas = Array.from({ length: cantidadNotas }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (i + 1) * randInt(12, 18));
        return d.toISOString().slice(0, 10);
      });
      const filasNotas = fechasNotas.map((fecha) => {
        const categoria = pick(CATEGORIAS);
        return { alumno_id: a.id, autor_id: profesorId, contenido: NOTAS_EJEMPLO[categoria], categoria, fecha };
      });
      const { error } = await supabase.from("ficha_evaluacion_notas").insert(filasNotas);
      if (error) throw error;
      notasCreadas += filasNotas.length;
    }
  }

  console.log(`✓ ${fichasCreadas} fichas de evaluación, ${pruebasCreadas} pruebas funcionales, ${notasCreadas} notas de evolución creadas`);
  console.log("\nListo. Todo lo creado tiene alumnos.es_demo = true.");
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
