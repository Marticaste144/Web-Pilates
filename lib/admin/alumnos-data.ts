import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nombreProfesorClase } from "@/lib/clases-profesor-nombre";
import type { EstadoInscripcion, EstadoPago, EstadoVisualCuota, MedioPago } from "@/types/database";

// "Alumna de MUV" ya no implica tener cuenta de Auth (ver migración
// 20260906090000_identidad_alumnas.sql) -- una alumna cargada a mano por la
// admin no tiene profiles/auth.users hasta que se le da acceso. Estado real,
// derivable de forma segura (nunca se inventa un estado que no podamos
// verificar):
//   - "sin_acceso": alumnos.profile_id es null -- nunca fue invitada.
//   - "invitado": tiene profile_id pero auth.users.email_confirmed_at es
//     null -- se generó el link pero todavía no confirmó ni eligió
//     contraseña (mismo criterio que profesores, ver profesores-data.ts).
//   - "activo": ya confirmó.
export type EstadoAccesoAlumno = "sin_acceso" | "invitado" | "activo";

export type AlumnoListItem = {
  alumnoId: string;
  nombre: string;
  apellido: string;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  estadoAcceso: EstadoAccesoAlumno;
  inscripcionesActivas: number;
};

async function mapaEstadoAcceso(profileIds: string[]): Promise<Map<string, EstadoAccesoAlumno>> {
  if (profileIds.length === 0) return new Map();

  const admin = createAdminClient();
  const entradas = await Promise.all(
    profileIds.map(async (id): Promise<[string, EstadoAccesoAlumno]> => {
      const { data } = await admin.auth.admin.getUserById(id);
      return [id, data?.user?.email_confirmed_at ? "activo" : "invitado"];
    }),
  );
  return new Map(entradas);
}

// A diferencia del roster del profesor, acá no hay restricción de
// visibilidad por cuota -- la admin ve a todos los alumnos siempre (RLS:
// "admin ve todos los perfiles"/"admin ve todos los alumnos", sin el
// fn_alumno_visible() que sí aplica para profesores).
//
// El filtro de texto se hace en JS, no con .or()/ilike de PostgREST -- antes
// armaba el filtro a mano con `.or(\`nombre.ilike.${like},...\`)`, el
// "escape hatch" crudo de postgrest-js (su propio código fuente lo dice:
// "value are used as-is... you need to make sure they are properly
// sanitized"). Eso es justo el bug reportado: buscar "LU" no encontraba a
// "Lucía" pero "LUC" sí -- consistente con un problema de esa capa cruda,
// no de la lógica de negocio. En vez de perseguir el detalle exacto de
// escaping de PostgREST, se saca la incertidumbre de raíz: para el volumen
// de alumnos de un centro chico, filtrar en JS (mismo criterio que el resto
// de lib/admin/*, que ya hace todo con fetch + reduce) es tan rápido como
// necesita ser y queda 100% determinístico -- se puede probar con datos
// sueltos sin depender de Supabase.
export type OrdenAlumnos = "apellido" | "nombre";

// Base: "alumnos" (existe con o sin cuenta), con "profiles" superpuesto
// cuando profile_id está presente -- mismo criterio que mapaIdentidadAlumnos,
// repetido acá en vez de reutilizarla directamente porque acá además hace
// falta ordenar/filtrar por nombre/apellido/email ya resueltos.
export async function listarAlumnos(query?: string, orden: OrdenAlumnos = "apellido"): Promise<AlumnoListItem[]> {
  const supabase = await createClient();

  const { data: alumnosRaw } = await supabase.from("alumnos").select("id, profile_id, nombre, apellido, email, telefono, activo");
  if (!alumnosRaw || alumnosRaw.length === 0) return [];

  const idsConCuenta = alumnosRaw.map((a) => a.profile_id).filter((id): id is string => id !== null);
  const [{ data: perfiles }, estadoPorProfileId] = await Promise.all([
    idsConCuenta.length > 0
      ? supabase.from("profiles").select("id, nombre, apellido, email, telefono").in("id", idsConCuenta)
      : Promise.resolve({ data: [] as { id: string; nombre: string; apellido: string; email: string; telefono: string | null }[] }),
    mapaEstadoAcceso(idsConCuenta),
  ]);
  const perfilPorId = new Map((perfiles ?? []).map((p) => [p.id, p]));

  const todos = alumnosRaw.map((a) => {
    const perfil = a.profile_id ? perfilPorId.get(a.profile_id) : null;
    const estadoAcceso: EstadoAccesoAlumno = !a.profile_id ? "sin_acceso" : (estadoPorProfileId.get(a.profile_id) ?? "invitado");
    return {
      alumnoId: a.id,
      nombre: perfil?.nombre ?? a.nombre ?? "?",
      apellido: perfil?.apellido ?? a.apellido ?? "",
      email: perfil?.email ?? a.email ?? null,
      telefono: perfil?.telefono ?? a.telefono ?? null,
      activo: a.activo,
      estadoAcceso,
    };
  });

  const texto = query?.trim().toLowerCase();
  const filtrados = texto
    ? todos.filter(
        (p) =>
          p.nombre.toLowerCase().includes(texto) ||
          p.apellido.toLowerCase().includes(texto) ||
          (p.email ?? "").toLowerCase().includes(texto),
      )
    : todos;

  if (filtrados.length === 0) return [];

  const alumnoIds = filtrados.map((p) => p.alumnoId);
  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("alumno_id")
    .in("alumno_id", alumnoIds)
    .eq("estado", "activa");

  const countPorAlumno = new Map<string, number>();
  for (const i of inscripciones ?? []) {
    countPorAlumno.set(i.alumno_id, (countPorAlumno.get(i.alumno_id) ?? 0) + 1);
  }

  return filtrados
    .map((p): AlumnoListItem => ({ ...p, inscripcionesActivas: countPorAlumno.get(p.alumnoId) ?? 0 }))
    .sort((a, b) => a[orden].localeCompare(b[orden], "es"));
}

export type AlumnoInscripcionItem = {
  inscripcionId: string;
  claseId: string;
  sedeId: string;
  sedeNombre: string;
  actividadNombre: string | null;
  profesorNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  estado: EstadoInscripcion;
  posicionEspera: number | null;
};

export type AlumnoClaseAnteriorItem = {
  inscripcionId: string;
  sedeNombre: string;
  actividadNombre: string | null;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  fechaBaja: string | null;
};

export type AlumnoCuotaItem = {
  sedeId: string;
  sedeNombre: string;
  estado: EstadoVisualCuota | "sin_pagos";
  vencimiento: string | null;
  monto: number | null;
  medio: MedioPago | null;
};

// Historial unificado de pagos -- reemplaza a los antiguos arrays separados
// "pagos" (últimos 10, cualquier medio) y "comprobantes" (todos los que
// tuvieran comprobante_url): ambos leían de la misma tabla con criterios
// apenas distintos, mostrados en dos secciones separadas de la UI vieja. Acá
// es UNA sola lista (todos los pagos, más reciente primero) -- "tiene
// comprobante" y "quién lo marcó" quedan como campos más, no como una
// consulta aparte.
export type AlumnoPagoItem = {
  id: string;
  sedeNombre: string | null;
  /** Actividad(es) que cubre este pago (modelo nuevo) o, si no tiene, la sede (modelo viejo) -- lo que haya real, nunca inventado. */
  conceptoLabel: string;
  monto: number;
  medio: MedioPago;
  estado: EstadoPago;
  createdAt: string;
  comprobanteUrl: string | null;
  marcadoPorNombre: string | null;
};

export type AlumnoDetalle = {
  alumnoId: string;
  nombre: string;
  apellido: string;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  estadoAcceso: EstadoAccesoAlumno;
  /** alumnos.created_at -- siempre existe (la fila se crea junto con la alumna, con o sin cuenta). */
  alumnoDesde: string | null;
  inscripciones: AlumnoInscripcionItem[];
  cuotas: AlumnoCuotaItem[];
  pagos: AlumnoPagoItem[];
};

export async function obtenerAlumno(alumnoId: string): Promise<AlumnoDetalle | null> {
  const supabase = await createClient();

  const { data: alumnoRow } = await supabase
    .from("alumnos")
    .select("id, profile_id, nombre, apellido, email, telefono, activo, created_at")
    .eq("id", alumnoId)
    .maybeSingle();
  if (!alumnoRow) return null;

  const [{ data: perfil }, estadoPorProfileId] = await Promise.all([
    alumnoRow.profile_id
      ? supabase.from("profiles").select("nombre, apellido, email, telefono").eq("id", alumnoRow.profile_id).maybeSingle()
      : Promise.resolve({ data: null }),
    alumnoRow.profile_id ? mapaEstadoAcceso([alumnoRow.profile_id]) : Promise.resolve(new Map<string, EstadoAccesoAlumno>()),
  ]);

  const nombre = perfil?.nombre ?? alumnoRow.nombre ?? "?";
  const apellido = perfil?.apellido ?? alumnoRow.apellido ?? "";
  const email = perfil?.email ?? alumnoRow.email ?? null;
  const telefono = perfil?.telefono ?? alumnoRow.telefono ?? null;
  const estadoAcceso: EstadoAccesoAlumno = !alumnoRow.profile_id
    ? "sin_acceso"
    : (estadoPorProfileId.get(alumnoRow.profile_id) ?? "invitado");

  const [
    { data: inscripcionesRaw, error: errorInscripciones },
    { data: sedes, error: errorSedes },
    { data: actividades, error: errorActividades },
    { data: cuotasRaw, error: errorCuotas },
    { data: pagosRaw, error: errorPagos },
  ] = await Promise.all([
    supabase
      .from("inscripciones")
      .select("id, clase_id, estado, posicion_espera")
      .eq("alumno_id", alumnoId)
      .in("estado", ["activa", "lista_espera"]),
    supabase.from("sedes").select("id, nombre"),
    supabase.from("actividades").select("id, nombre"),
    supabase
      .from("v_estado_cuota_alumno_sede")
      .select("sede_id, estado_visual, vencimiento, monto, medio")
      .eq("alumno_id", alumnoId),
    // Historial completo (no solo los últimos 10): ahora es la única fuente
    // del tab "Cuota y pagos" -- necesita verse todo, no un recorte.
    supabase
      .from("pagos")
      .select("id, sede_id, actividades_ids, monto, medio, estado, created_at, comprobante_url, marcado_por")
      .eq("alumno_id", alumnoId)
      .order("created_at", { ascending: false }),
  ]);

  // Antes estos errores se descartaban en silencio (solo se desestructuraba
  // "data") -- un error acá (ej. falta aplicar una migración en la base real,
  // como 20260813160000_vista_cuota_medio.sql, que agrega la columna "medio"
  // que se pide más abajo) hacía que cuotasRaw quedara undefined, y TODA
  // cuota -- pagada o no, por Mercado Pago o efectivo -- se mostrara como
  // "sin_pagos": exactamente el bug reportado de "marcar pagado en efectivo
  // no persiste" (el pago sí se insertaba bien, pero esta lectura fallaba
  // sola y silenciosamente). Ahora cualquier error de estas queries queda
  // en los logs del servidor en vez de disfrazarse de "no hay datos".
  if (errorInscripciones) console.error(`[alumnos-data] obtenerAlumno(${alumnoId}): error leyendo inscripciones`, errorInscripciones);
  if (errorSedes) console.error(`[alumnos-data] obtenerAlumno(${alumnoId}): error leyendo sedes`, errorSedes);
  if (errorActividades) console.error(`[alumnos-data] obtenerAlumno(${alumnoId}): error leyendo actividades`, errorActividades);
  if (errorCuotas) console.error(`[alumnos-data] obtenerAlumno(${alumnoId}): error leyendo v_estado_cuota_alumno_sede -- ¿falta aplicar una migración? (medio se agregó en 20260813160000_vista_cuota_medio.sql)`, errorCuotas);
  if (errorPagos) console.error(`[alumnos-data] obtenerAlumno(${alumnoId}): error leyendo pagos`, errorPagos);

  const sedeNombrePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  const actividadNombrePorId = new Map((actividades ?? []).map((a) => [a.id, a.nombre]));

  const claseIds = [...new Set((inscripcionesRaw ?? []).map((i) => i.clase_id))];
  const { data: clases } = claseIds.length
    ? await supabase
        .from("clases")
        .select("id, sede_id, actividad_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin")
        .in("id", claseIds)
    : { data: [] };
  const clasePorId = new Map((clases ?? []).map((c) => [c.id, c]));

  const profesorIds = [...new Set((clases ?? []).map((c) => c.profesor_id).filter((id): id is string => id !== null))];
  const { data: profesoresPerfil } =
    profesorIds.length > 0
      ? await supabase.from("profiles").select("id, nombre").in("id", profesorIds)
      : { data: [] as { id: string; nombre: string }[] };
  const profesorNombrePorId = new Map((profesoresPerfil ?? []).map((p) => [p.id, p.nombre]));

  const inscripciones: AlumnoInscripcionItem[] = (inscripcionesRaw ?? [])
    .map((i): AlumnoInscripcionItem | null => {
      const clase = clasePorId.get(i.clase_id);
      if (!clase) return null;
      return {
        inscripcionId: i.id,
        claseId: clase.id,
        sedeId: clase.sede_id,
        sedeNombre: sedeNombrePorId.get(clase.sede_id) ?? "?",
        actividadNombre: clase.actividad_id ? actividadNombrePorId.get(clase.actividad_id) ?? null : null,
        profesorNombre: nombreProfesorClase(
          clase.profesor_id ? profesorNombrePorId.get(clase.profesor_id) : null,
          clase.profesor_pendiente_nombre,
        ),
        diaSemana: clase.dia_semana,
        horaInicio: clase.hora_inicio,
        horaFin: clase.hora_fin,
        estado: i.estado,
        posicionEspera: i.posicion_espera,
      };
    })
    .filter((x): x is AlumnoInscripcionItem => x !== null)
    .sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio));

  // Sedes donde tiene alguna inscripción vigente pero no aparecen en
  // v_estado_cuota_alumno_sede (nunca pagó ahí) -- se completan como
  // "sin_pagos" en vez de quedar afuera del listado, mismo criterio que
  // lib/alumno/cuota-data.ts.
  const cuotaPorSede = new Map((cuotasRaw ?? []).map((c) => [c.sede_id, c]));

  const sedeIdsInscripcion = [...new Set(inscripciones.map((i) => i.sedeId))];

  const cuotas: AlumnoCuotaItem[] = [
    ...(cuotasRaw ?? []).map((c) => ({
      sedeId: c.sede_id,
      sedeNombre: sedeNombrePorId.get(c.sede_id) ?? "?",
      estado: c.estado_visual,
      vencimiento: c.vencimiento,
      monto: c.monto,
      medio: c.medio,
    })),
    ...sedeIdsInscripcion
      .filter((sedeId) => !cuotaPorSede.has(sedeId))
      .map((sedeId) => ({
        sedeId,
        sedeNombre: sedeNombrePorId.get(sedeId) ?? "?",
        estado: "sin_pagos" as const,
        vencimiento: null,
        monto: null,
        medio: null,
      })),
  ];

  const marcadoPorIds = [...new Set((pagosRaw ?? []).map((p) => p.marcado_por).filter((id): id is string => id !== null))];
  const { data: marcadoPorPerfiles } =
    marcadoPorIds.length > 0
      ? await supabase.from("profiles").select("id, nombre, apellido").in("id", marcadoPorIds)
      : { data: [] as { id: string; nombre: string; apellido: string }[] };
  const marcadoPorNombrePorId = new Map((marcadoPorPerfiles ?? []).map((p) => [p.id, `${p.nombre} ${p.apellido}`]));

  const pagos: AlumnoPagoItem[] = (pagosRaw ?? []).map((p) => {
    const actividadesLabel = (p.actividades_ids ?? [])
      .map((id: string) => actividadNombrePorId.get(id))
      .filter((n): n is string => Boolean(n))
      .join(" + ");
    return {
      id: p.id,
      sedeNombre: p.sede_id ? sedeNombrePorId.get(p.sede_id) ?? "?" : null,
      conceptoLabel: actividadesLabel || (p.sede_id ? sedeNombrePorId.get(p.sede_id) ?? "?" : "?"),
      monto: p.monto,
      medio: p.medio,
      estado: p.estado,
      createdAt: p.created_at,
      comprobanteUrl: p.comprobante_url,
      marcadoPorNombre: p.marcado_por ? marcadoPorNombrePorId.get(p.marcado_por) ?? null : null,
    };
  });

  return {
    alumnoId: alumnoRow.id,
    nombre,
    apellido,
    email,
    telefono,
    activo: alumnoRow.activo,
    estadoAcceso,
    alumnoDesde: alumnoRow.created_at,
    inscripciones,
    cuotas,
    pagos,
  };
}

// Clases de las que este alumno se dio de baja -- para el historial
// colapsable de la pestaña "Clases" (no se muestran de entrada, solo a
// pedido). No incluye "lista_espera" abandonada sin nunca haber estado
// activa -- estado='baja' es específicamente "estuvo anotado y se fue".
export async function listarClasesAnterioresAlumno(alumnoId: string): Promise<AlumnoClaseAnteriorItem[]> {
  const supabase = await createClient();

  const { data: inscripcionesRaw } = await supabase
    .from("inscripciones")
    .select("id, clase_id, fecha_baja")
    .eq("alumno_id", alumnoId)
    .eq("estado", "baja")
    .order("fecha_baja", { ascending: false });

  if (!inscripcionesRaw || inscripcionesRaw.length === 0) return [];

  const claseIds = [...new Set(inscripcionesRaw.map((i) => i.clase_id))];
  const [{ data: clases }, { data: sedes }, { data: actividades }] = await Promise.all([
    supabase.from("clases").select("id, sede_id, actividad_id, dia_semana, hora_inicio, hora_fin").in("id", claseIds),
    supabase.from("sedes").select("id, nombre"),
    supabase.from("actividades").select("id, nombre"),
  ]);
  const clasePorId = new Map((clases ?? []).map((c) => [c.id, c]));
  const sedeNombrePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  const actividadNombrePorId = new Map((actividades ?? []).map((a) => [a.id, a.nombre]));

  return inscripcionesRaw
    .map((i): AlumnoClaseAnteriorItem | null => {
      const clase = clasePorId.get(i.clase_id);
      if (!clase) return null;
      return {
        inscripcionId: i.id,
        sedeNombre: sedeNombrePorId.get(clase.sede_id) ?? "?",
        actividadNombre: clase.actividad_id ? actividadNombrePorId.get(clase.actividad_id) ?? null : null,
        diaSemana: clase.dia_semana,
        horaInicio: clase.hora_inicio,
        horaFin: clase.hora_fin,
        fechaBaja: i.fecha_baja,
      };
    })
    .filter((x): x is AlumnoClaseAnteriorItem => x !== null);
}

export type AsistenciaClaseMes = {
  claseId: string;
  sedeNombre: string;
  actividadNombre: string | null;
  diaSemana: number;
  horaInicio: string;
  dias: { fecha: string; estado: "presente" | "ausente" | "sin_marcar" }[];
};

// Asistencias del mes calendario actual, por cada clase activa del alumno --
// "sin_marcar" es una fecha real en la que la clase ocurrió (por su día de
// la semana) pero todavía no se tomó asistencia (o es en el futuro); nunca
// se inventa un estado que no esté en la tabla "asistencias". Recuperaciones
// (asistencias.es_recuperacion) NO se incluyen todavía acá -- pertenecen a
// una clase distinta a la habitual del alumno, así que no encajan en esta
// grilla "por clase propia"; queda para cuando se sume esa vista (pedido
// explícito: no inventar esa información todavía).
export async function listarAsistenciasDelMesAlumno(alumnoId: string): Promise<AsistenciaClaseMes[]> {
  const supabase = await createClient();

  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("clase_id")
    .eq("alumno_id", alumnoId)
    .eq("estado", "activa");

  const claseIds = [...new Set((inscripciones ?? []).map((i) => i.clase_id))];
  if (claseIds.length === 0) return [];

  const hoyIso = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const anio = Number(hoyIso.slice(0, 4));
  const mes = Number(hoyIso.slice(5, 7));
  const primerDiaMes = `${hoyIso.slice(0, 7)}-01`;

  const [{ data: clases }, { data: asistenciasRaw }] = await Promise.all([
    supabase.from("clases").select("id, sede_id, actividad_id, dia_semana, hora_inicio").in("id", claseIds),
    supabase
      .from("asistencias")
      .select("clase_id, fecha, estado")
      .eq("alumno_id", alumnoId)
      .in("clase_id", claseIds)
      .gte("fecha", primerDiaMes)
      .lte("fecha", hoyIso),
  ]);

  const sedeIds = [...new Set((clases ?? []).map((c) => c.sede_id))];
  const actividadIds = [...new Set((clases ?? []).map((c) => c.actividad_id).filter((id): id is string => Boolean(id)))];
  const [{ data: sedes }, { data: actividades }] = await Promise.all([
    sedeIds.length > 0 ? supabase.from("sedes").select("id, nombre").in("id", sedeIds) : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
    actividadIds.length > 0
      ? supabase.from("actividades").select("id, nombre").in("id", actividadIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
  ]);
  const sedeNombrePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  const actividadNombrePorId = new Map((actividades ?? []).map((a) => [a.id, a.nombre]));

  const asistenciaPorClaseFecha = new Map((asistenciasRaw ?? []).map((a) => [`${a.clase_id}:${a.fecha}`, a.estado]));

  const ultimoDiaDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();

  return (clases ?? []).map((c): AsistenciaClaseMes => {
    const dias: AsistenciaClaseMes["dias"] = [];
    for (let dia = 1; dia <= ultimoDiaDelMes; dia++) {
      const fecha = `${hoyIso.slice(0, 7)}-${String(dia).padStart(2, "0")}`;
      if (fecha > hoyIso) break; // no mostrar fechas futuras
      const fechaDate = new Date(Date.UTC(anio, mes - 1, dia));
      const diaSemanaIso = fechaDate.getUTCDay() === 0 ? 7 : fechaDate.getUTCDay();
      if (diaSemanaIso !== c.dia_semana) continue;
      const estado = asistenciaPorClaseFecha.get(`${c.id}:${fecha}`);
      dias.push({ fecha, estado: estado === "presente" || estado === "ausente" ? estado : "sin_marcar" });
    }
    return {
      claseId: c.id,
      sedeNombre: sedeNombrePorId.get(c.sede_id) ?? "?",
      actividadNombre: c.actividad_id ? actividadNombrePorId.get(c.actividad_id) ?? null : null,
      diaSemana: c.dia_semana,
      horaInicio: c.hora_inicio,
      dias,
    };
  });
}
