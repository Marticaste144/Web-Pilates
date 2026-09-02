import { createClient } from "@/lib/supabase/server";
import { obtenerFicha, listarNotasEvolucion } from "@/lib/fichas-evaluacion-data";
import { CATEGORIA_EVOLUCION_LABELS } from "@/lib/fichas-evaluacion-labels";
import { DIAS_SEMANA } from "@/lib/dias-semana";

// Línea de tiempo del alumno (Tarea 3): combina evaluación inicial +
// evolución + feedback de clases + futuras reevaluaciones en un solo listado
// cronológico, leyendo de las fuentes YA existentes -- no se copia nada a
// una tabla nueva. feedback_clases en particular se lee tal cual está (sus
// campos reales: clase_id/alumno_id/fecha/comentario), sin inventar
// columnas ni duplicar su contenido en ficha_evaluacion_notas.
export type LineaTiempoItem = {
  id: string;
  tipo: "evaluacion_inicial" | "reevaluacion" | "evolucion" | "feedback";
  fecha: string;
  categoriaLabel: string;
  detalle: string;
  autorNombre: string | null;
  claseLabel: string | null;
};

export async function obtenerLineaDeTiempo(alumnoId: string): Promise<LineaTiempoItem[]> {
  const supabase = await createClient();

  const [ficha, notas, { data: reevaluaciones }, { data: feedbackRaw, error: errorFeedback }] = await Promise.all([
    obtenerFicha(alumnoId),
    listarNotasEvolucion(alumnoId),
    supabase
      .from("ficha_evaluacion_pruebas_funcionales")
      .select("id, fecha, autor_id")
      .eq("alumno_id", alumnoId)
      .eq("es_inicial", false)
      .order("fecha", { ascending: false }),
    supabase.from("feedback_clases").select("id, clase_id, fecha, comentario").eq("alumno_id", alumnoId).order("fecha", { ascending: false }),
  ]);

  if (errorFeedback) {
    console.error("[seguimiento-data] error leyendo feedback_clases", errorFeedback);
  }

  const items: LineaTiempoItem[] = [];

  if (ficha.existe && ficha.fechaEvaluacion) {
    items.push({
      id: `ficha-${alumnoId}`,
      tipo: "evaluacion_inicial",
      fecha: ficha.fechaEvaluacion,
      categoriaLabel: "Evaluación inicial",
      detalle: ficha.observacionesIniciales || "Ficha de admisión completada.",
      autorNombre: ficha.profesionalEvaluadorNombre,
      claseLabel: null,
    });
  }

  for (const n of notas) {
    items.push({
      id: n.id,
      tipo: "evolucion",
      fecha: n.fecha,
      categoriaLabel: CATEGORIA_EVOLUCION_LABELS[n.categoria],
      detalle: n.contenido,
      autorNombre: n.autorNombre,
      claseLabel: n.claseLabel,
    });
  }

  const autorIdsReeval = [...new Set((reevaluaciones ?? []).map((r) => r.autor_id).filter((id): id is string => Boolean(id)))];
  const { data: autoresReeval } =
    autorIdsReeval.length > 0
      ? await supabase.from("profiles").select("id, nombre, apellido").in("id", autorIdsReeval)
      : { data: [] as { id: string; nombre: string; apellido: string }[] };
  const autorReevalPorId = new Map((autoresReeval ?? []).map((a) => [a.id, `${a.nombre} ${a.apellido}`]));

  for (const r of reevaluaciones ?? []) {
    items.push({
      id: r.id,
      tipo: "reevaluacion",
      fecha: r.fecha,
      categoriaLabel: "Reevaluación de pruebas funcionales",
      detalle: "Se registró una nueva evaluación de pruebas funcionales.",
      autorNombre: r.autor_id ? autorReevalPorId.get(r.autor_id) ?? null : null,
      claseLabel: null,
    });
  }

  const claseIds = [...new Set((feedbackRaw ?? []).map((f) => f.clase_id))];
  const { data: clases } =
    claseIds.length > 0
      ? await supabase.from("clases").select("id, sede_id, dia_semana, hora_inicio").in("id", claseIds)
      : { data: [] as { id: string; sede_id: string; dia_semana: number; hora_inicio: string }[] };
  const sedeIds = [...new Set((clases ?? []).map((c) => c.sede_id))];
  const { data: sedes } =
    sedeIds.length > 0 ? await supabase.from("sedes").select("id, nombre").in("id", sedeIds) : { data: [] as { id: string; nombre: string }[] };
  const sedeNombrePorId = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));
  const claseLabelPorId = new Map(
    (clases ?? []).map((c) => [
      c.id,
      `${sedeNombrePorId.get(c.sede_id) ?? "?"} · ${DIAS_SEMANA.find((d) => d.value === c.dia_semana)?.label ?? c.dia_semana} ${c.hora_inicio.slice(0, 5)}`,
    ]),
  );

  for (const f of feedbackRaw ?? []) {
    items.push({
      id: f.id,
      tipo: "feedback",
      fecha: f.fecha,
      categoriaLabel: "Feedback del alumno",
      detalle: f.comentario,
      autorNombre: null,
      claseLabel: claseLabelPorId.get(f.clase_id) ?? null,
    });
  }

  return items.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
}
