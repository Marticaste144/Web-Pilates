"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";
import type { CategoriaEvolucion } from "@/types/database";

// Todas las acciones son compartidas entre /admin/alumnos/[id] y
// /profesor/alumnas/[id] -- la RLS decide sola si quien llama puede tocar
// los datos de ese alumno (admin: cualquiera; profesor: solo el de sus
// alumnos visibles); acá no hace falta duplicar ese chequeo.

function revalidarFicha(alumnoId: string) {
  revalidatePath(`/admin/alumnos/${alumnoId}`);
  revalidatePath(`/profesor/alumnas/${alumnoId}`);
}

function campoTexto(formData: FormData, nombre: string): string | null {
  return String(formData.get(nombre) ?? "").trim() || null;
}

function campoNumerico(formData: FormData, nombre: string): number | null {
  const v = String(formData.get(nombre) ?? "").trim();
  return v ? Number(v) : null;
}

// ---------------------------------------------------------------------------
// Datos personales y antecedentes (página 1) -- sección independiente de
// Objetivos/contacto (página 3): cada una guarda solo SUS columnas, nunca
// pisa las de la otra sección aunque compartan la misma fila de
// fichas_evaluacion (upsert por alumno_id, igual que antes de esta tarea).
// ---------------------------------------------------------------------------
export async function guardarDatosPersonales(_prevState: FormState, formData: FormData): Promise<FormState> {
  const alumnoId = String(formData.get("alumno_id") ?? "");
  if (!alumnoId) {
    return { status: "error", message: "Falta identificar al alumno." };
  }

  const fechaEvaluacion = campoTexto(formData, "fecha_evaluacion");

  const { error } = await upsertFichaSeccion(alumnoId, {
    sede_id: campoTexto(formData, "sede_id"),
    ...(fechaEvaluacion ? { fecha_evaluacion: fechaEvaluacion } : {}),
    edad: campoNumerico(formData, "edad"),
    medico_deriva: campoTexto(formData, "medico_deriva"),
    actividad_fisica_previa: campoTexto(formData, "actividad_fisica_previa"),
    actividad_laboral: campoTexto(formData, "actividad_laboral"),
    diagnostico: campoTexto(formData, "diagnostico"),
    dolor_actual: campoNumerico(formData, "dolor_actual"),
    dolor_zona_momento: campoTexto(formData, "dolor_zona_momento"),
    observaciones_iniciales: campoTexto(formData, "observaciones_iniciales"),
  });

  if (error) {
    return { status: "error", message: error };
  }

  revalidarFicha(alumnoId);
  return { status: "success", message: "Datos guardados." };
}

// ---------------------------------------------------------------------------
// Objetivos, contacto y días posibles (página 3) -- ver nota arriba: NO crea
// ninguna planificación, es solo texto/selecciones libres de la ficha.
// ---------------------------------------------------------------------------
export async function guardarObjetivosContacto(_prevState: FormState, formData: FormData): Promise<FormState> {
  const alumnoId = String(formData.get("alumno_id") ?? "");
  if (!alumnoId) {
    return { status: "error", message: "Falta identificar al alumno." };
  }

  const diasPosibles = formData.getAll("dias_posibles").map(Number).filter((n) => Number.isInteger(n));
  const turnosPosibles = formData.getAll("turnos_posibles").map(String);

  const { error } = await upsertFichaSeccion(alumnoId, {
    objetivo_1: campoTexto(formData, "objetivo_1"),
    objetivo_2: campoTexto(formData, "objetivo_2"),
    objetivo_3: campoTexto(formData, "objetivo_3"),
    observaciones_planificacion: campoTexto(formData, "observaciones_planificacion"),
    contacto_familiar_nombre: campoTexto(formData, "contacto_familiar_nombre"),
    contacto_familiar_vinculo: campoTexto(formData, "contacto_familiar_vinculo"),
    contacto_familiar_telefono: campoTexto(formData, "contacto_familiar_telefono"),
    avisos_grupo: formData.get("avisos_grupo") === "on",
    avisos_grupo_numero: campoTexto(formData, "avisos_grupo_numero"),
    dias_posibles: diasPosibles.length > 0 ? diasPosibles : null,
    turnos_posibles: turnosPosibles.length > 0 ? turnosPosibles : null,
    horarios_posibles: campoTexto(formData, "horarios_posibles"),
  });

  if (error) {
    return { status: "error", message: error };
  }

  revalidarFicha(alumnoId);
  return { status: "success", message: "Datos guardados." };
}

// ---------------------------------------------------------------------------
// Pruebas funcionales (página 2) -- upsert sobre la fila es_inicial=true.
// Las reevaluaciones futuras (es_inicial=false) quedan fuera de esta acción
// a propósito: no hay UI para crearlas todavía.
// ---------------------------------------------------------------------------
export async function guardarPruebasFuncionales(_prevState: FormState, formData: FormData): Promise<FormState> {
  const alumnoId = String(formData.get("alumno_id") ?? "");
  if (!alumnoId) {
    return { status: "error", message: "Falta identificar al alumno." };
  }

  const campoSiNo = (nombre: string): boolean | null => {
    const v = formData.get(nombre);
    if (v === "si") return true;
    if (v === "no") return false;
    return null;
  };

  const datos = {
    elevacion_pierna_recta_derecha: campoTexto(formData, "elevacion_pierna_recta_derecha"),
    elevacion_pierna_recta_izquierda: campoTexto(formData, "elevacion_pierna_recta_izquierda"),
    elevacion_pierna_recta_obs: campoTexto(formData, "elevacion_pierna_recta_obs"),
    flexion_tronco_resultado: campoTexto(formData, "flexion_tronco_resultado"),
    flexion_tronco_obs: campoTexto(formData, "flexion_tronco_obs"),
    rotadores_cadera_derecha: campoTexto(formData, "rotadores_cadera_derecha"),
    rotadores_cadera_izquierda: campoTexto(formData, "rotadores_cadera_izquierda"),
    rotadores_cadera_obs: campoTexto(formData, "rotadores_cadera_obs"),
    equilibrio_cerrados_derecha_seg: campoNumerico(formData, "equilibrio_cerrados_derecha_seg"),
    equilibrio_cerrados_izquierda_seg: campoNumerico(formData, "equilibrio_cerrados_izquierda_seg"),
    equilibrio_cerrados_obs: campoTexto(formData, "equilibrio_cerrados_obs"),
    equilibrio_abiertos_derecha_seg: campoNumerico(formData, "equilibrio_abiertos_derecha_seg"),
    equilibrio_abiertos_izquierda_seg: campoNumerico(formData, "equilibrio_abiertos_izquierda_seg"),
    equilibrio_abiertos_obs: campoTexto(formData, "equilibrio_abiertos_obs"),
    alcance_manos_derecha: campoTexto(formData, "alcance_manos_derecha"),
    alcance_manos_izquierda: campoTexto(formData, "alcance_manos_izquierda"),
    alcance_manos_obs: campoTexto(formData, "alcance_manos_obs"),
    angel_pared_distancia_derecha_cm: campoNumerico(formData, "angel_pared_distancia_derecha_cm"),
    angel_pared_distancia_izquierda_cm: campoNumerico(formData, "angel_pared_distancia_izquierda_cm"),
    angel_pared_distancia_obs: campoTexto(formData, "angel_pared_distancia_obs"),
    angel_pared_apoya_nuca: campoSiNo("angel_pared_apoya_nuca"),
    angel_pared_apoya_lumbar: campoSiNo("angel_pared_apoya_lumbar"),
    angel_pared_apoyos_obs: campoTexto(formData, "angel_pared_apoyos_obs"),
    observaciones_generales: campoTexto(formData, "observaciones_generales"),
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existente } = await supabase
    .from("ficha_evaluacion_pruebas_funcionales")
    .select("id")
    .eq("alumno_id", alumnoId)
    .eq("es_inicial", true)
    .maybeSingle();

  const { error } = existente
    ? await supabase.from("ficha_evaluacion_pruebas_funcionales").update(datos).eq("id", existente.id)
    : await supabase
        .from("ficha_evaluacion_pruebas_funcionales")
        .insert({ ...datos, alumno_id: alumnoId, autor_id: user?.id ?? null });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidarFicha(alumnoId);
  return { status: "success", message: "Pruebas funcionales guardadas." };
}

// ---------------------------------------------------------------------------
// Evolución: append-only, una nota nueva por vez (nunca se editan ni se
// borran las anteriores -- sin policy de update/delete a propósito).
// ---------------------------------------------------------------------------
export async function agregarNotaEvolucion(_prevState: FormState, formData: FormData): Promise<FormState> {
  const alumnoId = String(formData.get("alumno_id") ?? "");
  const contenido = String(formData.get("contenido") ?? "").trim();
  const categoria = (String(formData.get("categoria") ?? "") || "seguimiento_general") as CategoriaEvolucion;
  const claseId = String(formData.get("clase_id") ?? "").trim() || null;

  if (!alumnoId) {
    return { status: "error", message: "Falta identificar al alumno." };
  }
  if (!contenido) {
    return { status: "error", message: "Escribí una nota antes de guardar." };
  }
  if (contenido.length > 2000) {
    return { status: "error", message: "La nota es demasiado larga (máx. 2000 caracteres)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("ficha_evaluacion_notas").insert({
    alumno_id: alumnoId,
    autor_id: user?.id ?? null,
    contenido,
    categoria,
    clase_id: claseId,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidarFicha(alumnoId);
  return { status: "success", message: "Nota agregada." };
}

// ---------------------------------------------------------------------------
// Helper interno (no exportado como Server Action -- "use server" exige que
// todo export de este archivo sea invocable como acción, por eso va después
// de todas las exportadas y sin "export"). Comparte el insert/update a mano
// entre guardarDatosPersonales y guardarObjetivosContacto.
// ---------------------------------------------------------------------------
async function upsertFichaSeccion(alumnoId: string, datos: Record<string, unknown>): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existente } = await supabase
    .from("fichas_evaluacion")
    .select("id")
    .eq("alumno_id", alumnoId)
    .maybeSingle();

  const { error } = existente
    ? await supabase
        .from("fichas_evaluacion")
        .update({ ...datos, actualizado_por: user?.id ?? null })
        .eq("alumno_id", alumnoId)
    : await supabase.from("fichas_evaluacion").insert({
        ...datos,
        alumno_id: alumnoId,
        actualizado_por: user?.id ?? null,
        profesional_evaluador_id: user?.id ?? null,
      });

  return { error: error?.message ?? null };
}
