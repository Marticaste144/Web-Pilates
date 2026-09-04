"use client";

import { useActionState } from "react";
import { guardarDatosPersonales } from "@/lib/fichas-evaluacion-actions";
import { initialFormState } from "@/lib/form-state";
import type { FichaEvaluacion, SedeOption } from "@/lib/fichas-evaluacion-data";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

// Página 1 del PDF real (Datos personales y antecedentes) -- nombre,
// apellido, teléfono y email NO se repiten acá: ya se muestran arriba de la
// página, leídos directamente de profiles.
//
// `seccion` (BLOQUE REDISEÑO PERFIL ALUMNO, Admin) separa visualmente este
// mismo formulario en "Datos iniciales" (gimnasio/fecha/edad/observaciones)
// y "Antecedentes" (médico que deriva/diagnóstico/actividad previa/laboral/
// dolor) para las subtabs de /admin/alumnos/[id] -- pero sigue siendo UN
// solo <form> con UN solo submit: el grupo que no corresponde a la sección
// activa se oculta con CSS (`hidden`), nunca se desmonta, así que guardar
// desde cualquiera de las dos subtabs sigue mandando TODOS los campos
// completos, igual que antes. Sin esta prop (uso en /profesor/alumnas/[id],
// que no tiene subtabs) se muestra todo junto, como siempre.
export function FichaDatosForm({
  ficha,
  sedes,
  readOnly = false,
  seccion = "todas",
}: {
  ficha: FichaEvaluacion;
  sedes: SedeOption[];
  readOnly?: boolean;
  seccion?: "todas" | "iniciales" | "antecedentes";
}) {
  const [state, formAction, pending] = useActionState(guardarDatosPersonales, initialFormState);
  const ocultar = (grupo: "iniciales" | "antecedentes") => seccion !== "todas" && seccion !== grupo;

  if (readOnly) {
    if (!ficha.existe) {
      return <p className="text-sm text-neutral-400">Sin ficha de admisión cargada.</p>;
    }
    return (
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <DatoReadOnly label="Gimnasio" valor={ficha.sedeNombre} />
        <DatoReadOnly label="Edad" valor={ficha.edad != null ? String(ficha.edad) : null} />
        <DatoReadOnly label="Médico/a que deriva" valor={ficha.medicoDeriva} />
        <DatoReadOnly label="Diagnóstico" valor={ficha.diagnostico} />
        <DatoReadOnly label="Actividad física (últimos 6 meses)" valor={ficha.actividadFisicaPrevia} className="sm:col-span-2" />
        <DatoReadOnly label="Actividad laboral" valor={ficha.actividadLaboral} className="sm:col-span-2" />
        <DatoReadOnly label="Dolor actual (1-10)" valor={ficha.dolorActual != null ? String(ficha.dolorActual) : null} />
        <DatoReadOnly label="Zona / momento de aparición" valor={ficha.dolorZonaMomento} />
        <DatoReadOnly label="Observaciones iniciales" valor={ficha.observacionesIniciales} className="sm:col-span-2" />
      </dl>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="alumno_id" value={ficha.alumnoId} />

      <div className={ocultar("iniciales") ? "hidden" : "flex flex-col gap-4"}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Gimnasio">
            <Select name="sede_id" defaultValue={ficha.sedeId ?? ""}>
              <option value="">Sin especificar</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha de evaluación">
            <Input type="date" name="fecha_evaluacion" defaultValue={ficha.fechaEvaluacion ?? ""} />
          </Field>
          <Field label="Edad">
            <Input type="number" name="edad" min={1} max={120} defaultValue={ficha.edad ?? ""} />
          </Field>
        </div>

        <Field label="Observaciones iniciales">
          <Textarea name="observaciones_iniciales" rows={3} defaultValue={ficha.observacionesIniciales ?? ""} />
        </Field>
      </div>

      <div className={ocultar("antecedentes") ? "hidden" : "flex flex-col gap-4"}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Médico/a que deriva">
            <Input name="medico_deriva" defaultValue={ficha.medicoDeriva ?? ""} />
          </Field>
          <Field label="Diagnóstico">
            <Input name="diagnostico" defaultValue={ficha.diagnostico ?? ""} />
          </Field>
        </div>

        <Field label="Actividad física realizada en los últimos 6 meses">
          <Textarea name="actividad_fisica_previa" rows={2} defaultValue={ficha.actividadFisicaPrevia ?? ""} />
        </Field>

        <Field label="Actividad laboral">
          <Textarea name="actividad_laboral" rows={2} defaultValue={ficha.actividadLaboral ?? ""} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
          <Field label="Dolor actual (1-10)" className="sm:w-40">
            <Select name="dolor_actual" defaultValue={ficha.dolorActual ?? ""}>
              <option value="">Sin dolor / no evaluado</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Zona / momento de aparición">
            <Input name="dolor_zona_momento" defaultValue={ficha.dolorZonaMomento ?? ""} />
          </Field>
        </div>
      </div>

      <FormAlert state={state} />
      <Button type="submit" size="sm" loading={pending} className="self-start">
        Guardar datos personales
      </Button>
    </form>
  );
}

function DatoReadOnly({ label, valor, className = "" }: { label: string; valor: string | null; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-neutral-500">{label}</dt>
      <dd className="whitespace-pre-wrap text-neutral-800">{valor || "--"}</dd>
    </div>
  );
}
