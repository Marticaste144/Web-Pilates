import { createAdminClient } from "@/lib/supabase/admin";

export type ResultadoSuspension = {
  evaluadas: number;
  suspendidas: number;
  conComprobanteEnRevision: number;
  errores: string[];
};

// Da de baja (estado='baja', libera el cupo solo) las inscripciones activas
// de un alumno en una sede cuando no pagó la cuota del MES CALENDARIO
// actual y ya pasó el día 10 + la tolerancia configurada
// (configuracion_pagos.dias_tolerancia). Un comprobante todavía "en
// revisión" (estado='procesando') SIEMPRE bloquea la baja, sin importar
// cuánto tarde la administración en revisarlo -- pedido explícito.
//
// Si dias_tolerancia todavía no está confirmado (null), esta función no
// suspende a NADIE -- falla seguro en vez de inventar un número de días.
export async function suspenderInscripcionesPorMora(): Promise<ResultadoSuspension> {
  const admin = createAdminClient();
  const resultado: ResultadoSuspension = { evaluadas: 0, suspendidas: 0, conComprobanteEnRevision: 0, errores: [] };

  const { data: config } = await admin
    .from("configuracion_pagos")
    .select("dias_tolerancia")
    .eq("id", true)
    .maybeSingle();

  const diasTolerancia = config?.dias_tolerancia;
  if (diasTolerancia === null || diasTolerancia === undefined) {
    return resultado; // sin confirmar todavía -- no se suspende a nadie
  }

  const hoy = new Date();
  const hoyIso = hoy.toISOString().slice(0, 10);
  const limiteTolerancia = 10 + diasTolerancia;
  if (hoy.getDate() <= limiteTolerancia) {
    return resultado; // todavía dentro del día 10 + tolerancia
  }

  const periodoMesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;

  const { data: inscripciones } = await admin.from("inscripciones").select("id, alumno_id, clase_id").eq("estado", "activa");
  if (!inscripciones || inscripciones.length === 0) return resultado;

  const claseIds = [...new Set(inscripciones.map((i) => i.clase_id))];
  const { data: clases } = await admin.from("clases").select("id, sede_id").in("id", claseIds);
  const sedePorClase = new Map((clases ?? []).map((c) => [c.id, c.sede_id]));

  const grupoPorAlumnoSede = new Map<string, { alumnoId: string; sedeId: string; inscripcionIds: string[] }>();
  for (const i of inscripciones) {
    const sedeId = sedePorClase.get(i.clase_id);
    if (!sedeId) continue;
    const key = `${i.alumno_id}:${sedeId}`;
    const grupo = grupoPorAlumnoSede.get(key) ?? { alumnoId: i.alumno_id, sedeId, inscripcionIds: [] };
    grupo.inscripcionIds.push(i.id);
    grupoPorAlumnoSede.set(key, grupo);
  }

  resultado.evaluadas = grupoPorAlumnoSede.size;

  for (const grupo of grupoPorAlumnoSede.values()) {
    const { data: pagos } = await admin
      .from("pagos")
      .select("estado, periodo_mes, vencimiento")
      .eq("alumno_id", grupo.alumnoId)
      .eq("sede_id", grupo.sedeId)
      .order("created_at", { ascending: false });

    // Cubre tanto el modelo nuevo (periodo_mes = este mes calendario) como
    // el ciclo rodante viejo (vencimiento todavía no pasó) -- para no dar
    // de baja a nadie que ya estaba al día bajo el modelo anterior mientras
    // dure la transición.
    const tienePagoVigente = (pagos ?? []).some(
      (p) => p.estado === "aprobado" && (p.periodo_mes === periodoMesActual || (p.vencimiento !== null && p.vencimiento >= hoyIso)),
    );
    if (tienePagoVigente) continue;

    const tieneComprobanteEnRevision = (pagos ?? []).some((p) => p.estado === "procesando");
    if (tieneComprobanteEnRevision) {
      resultado.conComprobanteEnRevision++;
      continue;
    }

    const { error } = await admin
      .from("inscripciones")
      .update({ estado: "baja", fecha_baja: new Date().toISOString() })
      .in("id", grupo.inscripcionIds);

    if (error) {
      resultado.errores.push(`alumno ${grupo.alumnoId} sede ${grupo.sedeId}: ${error.message}`);
    } else {
      resultado.suspendidas += grupo.inscripcionIds.length;
    }
  }

  return resultado;
}
