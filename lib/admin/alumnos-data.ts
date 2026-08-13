import { createClient } from "@/lib/supabase/server";
import type { EstadoInscripcion, EstadoVisualCuota, EstadoPago, MedioPago } from "@/types/database";

export type AlumnoListItem = {
  profileId: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  inscripcionesActivas: number;
};

// A diferencia del roster del profesor, acá no hay restricción de
// visibilidad por cuota -- la admin ve a todos los alumnos siempre (RLS:
// "admin ve todos los perfiles"/"admin ve todos los alumnos", sin el
// fn_alumno_visible() que sí aplica para profesores).
export async function listarAlumnos(query?: string): Promise<AlumnoListItem[]> {
  const supabase = await createClient();

  let q = supabase
    .from("profiles")
    .select("id, nombre, apellido, email, telefono")
    .eq("role", "alumno");

  const texto = query?.trim();
  if (texto) {
    const like = `%${texto}%`;
    q = q.or(`nombre.ilike.${like},apellido.ilike.${like},email.ilike.${like}`);
  }

  const { data: perfiles } = await q.order("apellido");
  if (!perfiles || perfiles.length === 0) return [];

  const alumnoIds = perfiles.map((p) => p.id);
  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("alumno_id")
    .in("alumno_id", alumnoIds)
    .eq("estado", "activa");

  const countPorAlumno = new Map<string, number>();
  for (const i of inscripciones ?? []) {
    countPorAlumno.set(i.alumno_id, (countPorAlumno.get(i.alumno_id) ?? 0) + 1);
  }

  return perfiles.map((p) => ({
    profileId: p.id,
    nombre: p.nombre,
    apellido: p.apellido,
    email: p.email,
    telefono: p.telefono,
    inscripcionesActivas: countPorAlumno.get(p.id) ?? 0,
  }));
}

export type AlumnoInscripcionItem = {
  inscripcionId: string;
  sedeNombre: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  estado: EstadoInscripcion;
  posicionEspera: number | null;
};

export type AlumnoCuotaItem = {
  sedeId: string;
  sedeNombre: string;
  estado: EstadoVisualCuota | "sin_pagos";
  vencimiento: string | null;
  monto: number | null;
  medio: MedioPago | null;
};

export type ComprobanteItem = {
  pagoId: string;
  sedeNombre: string;
  monto: number;
  estado: EstadoPago;
  createdAt: string;
};

export type AlumnoDetalle = {
  profileId: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  inscripciones: AlumnoInscripcionItem[];
  cuotas: AlumnoCuotaItem[];
  comprobantes: ComprobanteItem[];
};

export async function obtenerAlumno(profileId: string): Promise<AlumnoDetalle | null> {
  const supabase = await createClient();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, nombre, apellido, email, telefono")
    .eq("id", profileId)
    .eq("role", "alumno")
    .single();

  if (!perfil) return null;

  const [{ data: inscripcionesRaw }, { data: sedes }, { data: cuotasRaw }, { data: comprobantesRaw }] =
    await Promise.all([
      supabase
        .from("inscripciones")
        .select("id, clase_id, estado, posicion_espera")
        .eq("alumno_id", profileId)
        .in("estado", ["activa", "lista_espera"]),
      supabase.from("sedes").select("id, nombre"),
      supabase
        .from("v_estado_cuota_alumno_sede")
        .select("sede_id, estado_visual, vencimiento, monto, medio")
        .eq("alumno_id", profileId),
      // Pagos con comprobante subido por el alumno -- puede haber quedado
      // "pendiente" (esperando revisión) o ya "aprobado" (si la admin lo
      // confirmó, o si además se pagó por Mercado Pago). Se listan todos,
      // no solo los pendientes, como "registro visual" según lo pedido.
      supabase
        .from("pagos")
        .select("id, sede_id, monto, estado, created_at")
        .eq("alumno_id", profileId)
        .not("comprobante_url", "is", null)
        .order("created_at", { ascending: false }),
    ]);

  const sedeNombrePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));

  const claseIds = [...new Set((inscripcionesRaw ?? []).map((i) => i.clase_id))];
  const { data: clases } = claseIds.length
    ? await supabase.from("clases").select("id, sede_id, dia_semana, hora_inicio, hora_fin").in("id", claseIds)
    : { data: [] };
  const clasePorId = new Map((clases ?? []).map((c) => [c.id, c]));

  const inscripciones: AlumnoInscripcionItem[] = (inscripcionesRaw ?? [])
    .map((i): AlumnoInscripcionItem | null => {
      const clase = clasePorId.get(i.clase_id);
      if (!clase) return null;
      return {
        inscripcionId: i.id,
        sedeNombre: sedeNombrePorId.get(clase.sede_id) ?? "?",
        diaSemana: clase.dia_semana,
        horaInicio: clase.hora_inicio,
        horaFin: clase.hora_fin,
        estado: i.estado,
        posicionEspera: i.posicion_espera,
      };
    })
    .filter((x): x is AlumnoInscripcionItem => x !== null);

  // Sedes donde tiene alguna inscripción vigente pero no aparecen en
  // v_estado_cuota_alumno_sede (nunca pagó ahí) -- se completan como
  // "sin_pagos" en vez de quedar afuera del listado, mismo criterio que
  // lib/alumno/cuota-data.ts.
  const cuotaPorSede = new Map((cuotasRaw ?? []).map((c) => [c.sede_id, c]));

  const sedeIdsInscripcion = [
    ...new Set(
      (inscripcionesRaw ?? [])
        .map((i) => clasePorId.get(i.clase_id)?.sede_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

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

  const comprobantes: ComprobanteItem[] = (comprobantesRaw ?? []).map((p) => ({
    pagoId: p.id,
    sedeNombre: sedeNombrePorId.get(p.sede_id) ?? "?",
    monto: p.monto,
    estado: p.estado,
    createdAt: p.created_at,
  }));

  return {
    profileId: perfil.id,
    nombre: perfil.nombre,
    apellido: perfil.apellido,
    email: perfil.email,
    telefono: perfil.telefono,
    inscripciones,
    cuotas,
    comprobantes,
  };
}
