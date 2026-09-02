"use client";

import { useActionState } from "react";
import { guardarObjetivosContacto } from "@/lib/fichas-evaluacion-actions";
import { initialFormState } from "@/lib/form-state";
import { TURNO_LABELS } from "@/lib/fichas-evaluacion-labels";
import type { FichaEvaluacion } from "@/lib/fichas-evaluacion-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import type { TurnoPosible } from "@/types/database";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

// Página 3 del PDF real (Objetivos y planificación / Contacto y avisos /
// Días posibles). Esto NO crea ninguna planificación -- son solo campos de
// texto/selección de la ficha, la planificación real es un sistema aparte.
const DIAS_FICHA = DIAS_SEMANA.filter((d) => d.value <= 6); // el PDF no incluye domingo
const TURNOS: TurnoPosible[] = ["manana", "tarde", "noche"];

export function ObjetivosContactoForm({ ficha, readOnly = false }: { ficha: FichaEvaluacion; readOnly?: boolean }) {
  const [state, formAction, pending] = useActionState(guardarObjetivosContacto, initialFormState);

  if (readOnly) {
    if (!ficha.existe) {
      return <p className="text-sm text-neutral-400">Sin objetivos/contacto cargados.</p>;
    }
    const dias = ficha.diasPosibles.map((d) => DIAS_SEMANA.find((x) => x.value === d)?.label ?? d).join(", ");
    const turnos = ficha.turnosPosibles.map((t) => TURNO_LABELS[t]).join(", ");
    return (
      <div className="flex flex-col gap-3 text-sm">
        <div>
          <p className="text-xs font-medium text-neutral-500">Objetivos</p>
          <ul className="list-disc pl-5 text-neutral-800">
            {[ficha.objetivo1, ficha.objetivo2, ficha.objetivo3].filter(Boolean).map((o, i) => (
              <li key={i}>{o}</li>
            ))}
            {!ficha.objetivo1 && !ficha.objetivo2 && !ficha.objetivo3 && <li className="list-none text-neutral-400">Sin objetivos cargados.</li>}
          </ul>
        </div>
        {ficha.observacionesPlanificacion && (
          <div>
            <p className="text-xs font-medium text-neutral-500">Observaciones para la planificación</p>
            <p className="whitespace-pre-wrap text-neutral-800">{ficha.observacionesPlanificacion}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-neutral-500">Contacto familiar</p>
          <p className="text-neutral-800">
            {ficha.contactoFamiliarNombre || "--"}
            {ficha.contactoFamiliarVinculo ? ` (${ficha.contactoFamiliarVinculo})` : ""}
            {ficha.contactoFamiliarTelefono ? ` · ${ficha.contactoFamiliarTelefono}` : ""}
          </p>
          <p className="text-neutral-800">
            Grupo de avisos: {ficha.avisosGrupo == null ? "sin especificar" : ficha.avisosGrupo ? "Sí" : "No"}
            {ficha.avisosGrupo && ficha.avisosGrupoNumero ? ` · ${ficha.avisosGrupoNumero}` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500">Días posibles</p>
          <p className="text-neutral-800">{dias || "--"}</p>
          <p className="text-neutral-800">Turno: {turnos || "--"}</p>
          {ficha.horariosPosibles && <p className="text-neutral-800">Horarios: {ficha.horariosPosibles}</p>}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="alumno_id" value={ficha.alumnoId} />

      <div className="flex flex-col gap-3">
        <Field label="Objetivo 1">
          <Input name="objetivo_1" defaultValue={ficha.objetivo1 ?? ""} />
        </Field>
        <Field label="Objetivo 2">
          <Input name="objetivo_2" defaultValue={ficha.objetivo2 ?? ""} />
        </Field>
        <Field label="Objetivo 3">
          <Input name="objetivo_3" defaultValue={ficha.objetivo3 ?? ""} />
        </Field>
        <Field label="Observaciones para la planificación" hint="Solo texto de referencia -- no crea ninguna planificación automáticamente.">
          <Textarea name="observaciones_planificacion" rows={2} defaultValue={ficha.observacionesPlanificacion ?? ""} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Contacto familiar">
          <Input name="contacto_familiar_nombre" defaultValue={ficha.contactoFamiliarNombre ?? ""} />
        </Field>
        <Field label="Vínculo">
          <Input name="contacto_familiar_vinculo" defaultValue={ficha.contactoFamiliarVinculo ?? ""} />
        </Field>
        <Field label="Número de contacto familiar">
          <Input name="contacto_familiar_telefono" defaultValue={ficha.contactoFamiliarTelefono ?? ""} />
        </Field>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            name="avisos_grupo"
            defaultChecked={ficha.avisosGrupo ?? false}
            className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-400"
          />
          Agregar al grupo de avisos
        </label>
        <Field label="Número" className="flex-1 min-w-[10rem]">
          <Input name="avisos_grupo_numero" defaultValue={ficha.avisosGrupoNumero ?? ""} />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-neutral-700">Días posibles</p>
        <div className="flex flex-wrap gap-3">
          {DIAS_FICHA.map((d) => (
            <label key={d.value} className="flex items-center gap-1.5 text-sm text-neutral-700">
              <input
                type="checkbox"
                name="dias_posibles"
                value={d.value}
                defaultChecked={ficha.diasPosibles.includes(d.value)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-400"
              />
              {d.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-neutral-700">Turno</p>
        <div className="flex flex-wrap gap-3">
          {TURNOS.map((t) => (
            <label key={t} className="flex items-center gap-1.5 text-sm text-neutral-700">
              <input
                type="checkbox"
                name="turnos_posibles"
                value={t}
                defaultChecked={ficha.turnosPosibles.includes(t)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-400"
              />
              {TURNO_LABELS[t]}
            </label>
          ))}
        </div>
      </div>

      <Field label="Horarios posibles">
        <Input name="horarios_posibles" defaultValue={ficha.horariosPosibles ?? ""} />
      </Field>

      <FormAlert state={state} />
      <Button type="submit" size="sm" loading={pending} className="self-start">
        Guardar objetivos y contacto
      </Button>
    </form>
  );
}
