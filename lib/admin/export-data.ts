import { createClient } from "@/lib/supabase/server";
import type { EstadoPago, MedioPago, EstadoVisualCuota } from "@/types/database";

// Mismos textos que ya se usan en las pantallas (app/admin/alumnos/[id]/page.tsx,
// app/alumno/cuota/page.tsx, etc.) -- se repiten acá en vez de importarlos
// porque ahí viven junto al "variant" del Badge (color), que un CSV no usa.
const ESTADO_CUOTA_TEXTO: Record<EstadoVisualCuota | "sin_pagos", string> = {
  al_dia: "Al día",
  por_vencer: "Por vencer",
  vencida: "Vencida",
  sin_pagos: "Sin pagos registrados",
};

const ESTADO_PAGO_TEXTO: Record<EstadoPago, string> = {
  pendiente: "Pendiente de revisión",
  procesando: "Procesando",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

const MEDIO_TEXTO: Record<MedioPago, string> = {
  mercadopago: "Mercado Pago",
  efectivo: "Efectivo",
  transferencia: "Transferencia",
};

export type AlumnoExportRow = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  sedeNombre: string;
  estadoCuota: string;
  vencimiento: string | null;
  monto: number | null;
};

// Una fila por (alumno, sede) -- un alumno anotado en más de una sede
// aparece una vez por cada una, con el estado de cuota de esa sede
// puntual, mismo criterio de "completar sedes sin fila en la vista con
// sin_pagos" que ya usa obtenerAlumno() para el detalle de un alumno. Si un
// alumno no tiene ninguna sede (nunca se anotó a nada), igual aparece con
// una fila así el CSV no lo omite.
export async function listarAlumnosParaExportar(): Promise<AlumnoExportRow[]> {
  const supabase = await createClient();

  const [
    { data: alumnos, error: errorAlumnos },
    { data: sedes, error: errorSedes },
    { data: cuotas, error: errorCuotas },
    { data: inscripciones, error: errorInscripciones },
    { data: clases, error: errorClases },
  ] = await Promise.all([
    supabase.from("profiles").select("id, nombre, apellido, email, telefono").eq("role", "alumno").order("apellido"),
    supabase.from("sedes").select("id, nombre"),
    supabase.from("v_estado_cuota_alumno_sede").select("alumno_id, sede_id, estado_visual, vencimiento, monto"),
    supabase.from("inscripciones").select("alumno_id, clase_id").in("estado", ["activa", "lista_espera"]),
    supabase.from("clases").select("id, sede_id"),
  ]);

  if (errorAlumnos) console.error("[export-data] listarAlumnosParaExportar: error leyendo profiles", errorAlumnos);
  if (errorSedes) console.error("[export-data] listarAlumnosParaExportar: error leyendo sedes", errorSedes);
  if (errorCuotas) console.error("[export-data] listarAlumnosParaExportar: error leyendo v_estado_cuota_alumno_sede", errorCuotas);
  if (errorInscripciones) console.error("[export-data] listarAlumnosParaExportar: error leyendo inscripciones", errorInscripciones);
  if (errorClases) console.error("[export-data] listarAlumnosParaExportar: error leyendo clases", errorClases);

  const sedeNombrePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  const sedeIdPorClaseId = new Map((clases ?? []).map((c) => [c.id, c.sede_id]));

  const cuotasPorAlumno = new Map<string, typeof cuotas>();
  for (const c of cuotas ?? []) {
    const lista = cuotasPorAlumno.get(c.alumno_id) ?? [];
    lista.push(c);
    cuotasPorAlumno.set(c.alumno_id, lista);
  }

  const sedeIdsPorAlumno = new Map<string, Set<string>>();
  for (const i of inscripciones ?? []) {
    const sedeId = sedeIdPorClaseId.get(i.clase_id);
    if (!sedeId) continue;
    const set = sedeIdsPorAlumno.get(i.alumno_id) ?? new Set<string>();
    set.add(sedeId);
    sedeIdsPorAlumno.set(i.alumno_id, set);
  }

  const filas: AlumnoExportRow[] = [];

  for (const alumno of alumnos ?? []) {
    const cuotasAlumno = cuotasPorAlumno.get(alumno.id) ?? [];
    const sedeIdsConCuota = new Set(cuotasAlumno.map((c) => c.sede_id));
    const sedeIdsInscripcion = sedeIdsPorAlumno.get(alumno.id) ?? new Set<string>();
    const todasLasSedeIds = new Set([...sedeIdsConCuota, ...sedeIdsInscripcion]);

    if (todasLasSedeIds.size === 0) {
      filas.push({
        nombre: alumno.nombre,
        apellido: alumno.apellido,
        email: alumno.email,
        telefono: alumno.telefono,
        sedeNombre: "-",
        estadoCuota: ESTADO_CUOTA_TEXTO.sin_pagos,
        vencimiento: null,
        monto: null,
      });
      continue;
    }

    for (const sedeId of todasLasSedeIds) {
      const cuota = cuotasAlumno.find((c) => c.sede_id === sedeId);
      filas.push({
        nombre: alumno.nombre,
        apellido: alumno.apellido,
        email: alumno.email,
        telefono: alumno.telefono,
        sedeNombre: sedeNombrePorId.get(sedeId) ?? "?",
        estadoCuota: ESTADO_CUOTA_TEXTO[cuota?.estado_visual ?? "sin_pagos"],
        vencimiento: cuota?.vencimiento ?? null,
        monto: cuota?.monto ?? null,
      });
    }
  }

  return filas;
}

export type PagoExportRow = {
  fecha: string;
  alumnoNombre: string;
  alumnoEmail: string;
  sedeNombre: string;
  monto: number;
  medio: string;
  estado: string;
};

// Historial completo (todos los estados, no solo "aprobado") para que la
// admin pueda ver también pagos pendientes/rechazados si lo necesita --
// más fácil filtrar de más en la planilla que tener que volver a pedir un
// export distinto.
export async function listarPagosParaExportar(): Promise<PagoExportRow[]> {
  const supabase = await createClient();

  const [
    { data: pagos, error: errorPagos },
    { data: alumnos, error: errorAlumnos },
    { data: sedes, error: errorSedes },
  ] = await Promise.all([
    supabase
      .from("pagos")
      .select("created_at, alumno_id, sede_id, monto, medio, estado")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, nombre, apellido, email"),
    supabase.from("sedes").select("id, nombre"),
  ]);

  if (errorPagos) console.error("[export-data] listarPagosParaExportar: error leyendo pagos", errorPagos);
  if (errorAlumnos) console.error("[export-data] listarPagosParaExportar: error leyendo profiles", errorAlumnos);
  if (errorSedes) console.error("[export-data] listarPagosParaExportar: error leyendo sedes", errorSedes);

  const alumnoPorId = new Map((alumnos ?? []).map((a) => [a.id, a]));
  const sedeNombrePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));

  return (pagos ?? []).map((p): PagoExportRow => {
    const alumno = alumnoPorId.get(p.alumno_id);
    return {
      fecha: p.created_at,
      alumnoNombre: alumno ? `${alumno.nombre} ${alumno.apellido}` : "?",
      alumnoEmail: alumno?.email ?? "?",
      sedeNombre: (p.sede_id && sedeNombrePorId.get(p.sede_id)) || "?",
      monto: p.monto,
      medio: MEDIO_TEXTO[p.medio],
      estado: ESTADO_PAGO_TEXTO[p.estado],
    };
  });
}
