import { createClient } from "@/lib/supabase/server";

export type HorarioEquipoItem = { diaSemana: number; horaInicio: string; horaFin: string };

export type ProfesorEquipoItem = {
  /** id real de profiles, o `pendiente:<nombre>` si todavía no tiene cuenta -- sin link a detalle en ese caso. */
  key: string;
  profesorId: string | null;
  nombre: string;
  horarios: HorarioEquipoItem[];
};

export type ActividadConProfesores = {
  actividadId: string | null;
  actividadNombre: string;
  profesores: ProfesorEquipoItem[];
};

export type SedeConEquipo = {
  sedeId: string;
  sedeNombre: string;
  actividades: ActividadConProfesores[];
};

// CORRECCIÓN (auditoría general): antes esta función descartaba directo
// cualquier clase sin profesor_id real (`if (!c.profesor_id) continue`), o
// sea que los ~14 profesores reales todavía sin cuenta (Rocío, Gabriela,
// Mariel, Gonzalo, Nicolás, Nacho, Analía, Sofía, Yayi, Camila, Alan,
// Richard, Pablo, Matías -- ver clases.profesor_pendiente_nombre)
// directamente no aparecían en "Equipo", que terminaba mostrando solo 2-3
// profesores. Se reescribe para agrupar SEDE -> ACTIVIDAD -> PROFESOR (real
// o pendiente, por nombre) -> sus días/horarios reales -- útil de verdad
// para saber a quién contactar/reemplazar. Nunca depende de si el profesor
// tiene planificación cargada (no se toca planificaciones acá).
export async function listarEquipoPorSede(): Promise<SedeConEquipo[]> {
  const supabase = await createClient();

  const [{ data: sedes }, { data: actividades }, { data: clases }] = await Promise.all([
    supabase.from("sedes").select("id, nombre").order("nombre"),
    supabase.from("actividades").select("id, nombre"),
    supabase
      .from("clases")
      .select("sede_id, actividad_id, profesor_id, profesor_pendiente_nombre, dia_semana, hora_inicio, hora_fin"),
  ]);

  const actividadNombrePorId = new Map((actividades ?? []).map((a) => [a.id, a.nombre]));

  const profesorIdsReales = [...new Set((clases ?? []).map((c) => c.profesor_id).filter((id): id is string => id !== null))];
  const { data: perfiles } =
    profesorIdsReales.length > 0
      ? await supabase.from("profiles").select("id, nombre").in("id", profesorIdsReales)
      : { data: [] as { id: string; nombre: string }[] };
  const nombrePorProfesorId = new Map((perfiles ?? []).map((p) => [p.id, p.nombre]));

  // Agrupa por (sede, actividad, profesor) -- cada grupo junta todos los
  // horarios reales de esa combinación. Un mismo profesor en dos
  // sedes/actividades distintas genera dos grupos separados a propósito
  // (aparece en cada una, como pide el pedido).
  type Grupo = { sedeId: string; actividadId: string | null; profesorId: string | null; nombre: string; horarios: HorarioEquipoItem[] };
  const grupos = new Map<string, Grupo>();

  for (const c of clases ?? []) {
    const nombre = c.profesor_id ? nombrePorProfesorId.get(c.profesor_id) ?? "?" : c.profesor_pendiente_nombre ?? "?";
    const clavePersona = c.profesor_id ?? `pendiente:${c.profesor_pendiente_nombre}`;
    const claveGrupo = `${c.sede_id}:${c.actividad_id ?? "null"}:${clavePersona}`;

    const grupo = grupos.get(claveGrupo) ?? {
      sedeId: c.sede_id,
      actividadId: c.actividad_id,
      profesorId: c.profesor_id,
      nombre,
      horarios: [],
    };
    grupo.horarios.push({ diaSemana: c.dia_semana, horaInicio: c.hora_inicio, horaFin: c.hora_fin });
    grupos.set(claveGrupo, grupo);
  }

  const gruposPorSedeActividad = new Map<string, Grupo[]>();
  for (const g of grupos.values()) {
    const clave = `${g.sedeId}:${g.actividadId ?? "null"}`;
    const lista = gruposPorSedeActividad.get(clave) ?? [];
    lista.push(g);
    gruposPorSedeActividad.set(clave, lista);
  }

  const actividadIdsPorSede = new Map<string, Set<string | null>>();
  for (const g of grupos.values()) {
    const set = actividadIdsPorSede.get(g.sedeId) ?? new Set<string | null>();
    set.add(g.actividadId);
    actividadIdsPorSede.set(g.sedeId, set);
  }

  const DIA_ORDEN = (dia: number) => (dia === 7 ? 0 : dia); // domingo al final, resto en orden normal -- no aplica hoy (no hay clases domingo) pero es correcto igual

  // Todas las sedes se muestran, aunque no tengan profesores todavía (mismo
  // criterio que la versión anterior de este archivo) -- la página muestra
  // un mensaje en vez de ocultar la sede.
  return (sedes ?? [])
    .map((s): SedeConEquipo => {
      const actividadIds = [...(actividadIdsPorSede.get(s.id) ?? [])];
      const actividadesSede = actividadIds
        .map((actividadId): ActividadConProfesores => {
          const gruposAct = gruposPorSedeActividad.get(`${s.id}:${actividadId ?? "null"}`) ?? [];
          const profesores = gruposAct
            .map(
              (g): ProfesorEquipoItem => ({
                key: g.profesorId ?? `pendiente:${g.nombre}`,
                profesorId: g.profesorId,
                nombre: g.nombre,
                horarios: [...g.horarios].sort((a, b) => DIA_ORDEN(a.diaSemana) - DIA_ORDEN(b.diaSemana) || a.horaInicio.localeCompare(b.horaInicio)),
              }),
            )
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
          return {
            actividadId,
            actividadNombre: actividadId ? actividadNombrePorId.get(actividadId) ?? "?" : "Sin clasificar",
            profesores,
          };
        })
        .sort((a, b) => a.actividadNombre.localeCompare(b.actividadNombre, "es"));

      return { sedeId: s.id, sedeNombre: s.nombre, actividades: actividadesSede };
    });
}
