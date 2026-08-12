"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/form-state";
import { initialFormState } from "@/lib/form-state";
import type { ProfesorSelectItem, SedeItem, ClaseListItem } from "@/lib/admin/clases-data";
import { DIAS_SEMANA } from "@/lib/dias-semana";
import { Field, Select, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

export function ClaseForm({
  action,
  sedes,
  profesores,
  clase,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  sedes: SedeItem[];
  profesores: ProfesorSelectItem[];
  clase?: ClaseListItem;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {clase && <input type="hidden" name="id" value={clase.id} />}

      <div className="flex flex-wrap gap-3">
        <Field label="Sede" className="min-w-[9rem] flex-1">
          <Select name="sede_id" defaultValue={clase?.sedeId ?? ""} required>
            <option value="" disabled>
              Elegir sede
            </option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Profesor/a" className="min-w-[9rem] flex-1">
          <Select name="profesor_id" defaultValue={clase?.profesorId ?? ""} required>
            <option value="" disabled>
              Elegir profesor/a
            </option>
            {profesores.map((p) => (
              <option key={p.profileId} value={p.profileId}>
                {p.nombre} {p.apellido}
                {!p.activo ? " (inactivo)" : ""}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Día" className="min-w-[8rem] flex-1">
          <Select name="dia_semana" defaultValue={clase?.diaSemana ?? ""} required>
            <option value="" disabled>
              Elegir día
            </option>
            {DIAS_SEMANA.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Hora inicio" className="w-32">
          <Input type="time" name="hora_inicio" defaultValue={clase?.horaInicio?.slice(0, 5) ?? ""} required />
        </Field>

        <Field label="Hora fin" className="w-32">
          <Input type="time" name="hora_fin" defaultValue={clase?.horaFin?.slice(0, 5) ?? ""} required />
        </Field>

        <Field label="Cupo" className="w-24">
          <Input type="number" name="cupo" min={1} defaultValue={clase?.cupo ?? 8} required />
        </Field>
      </div>

      <FormAlert state={state} />

      <Button type="submit" loading={pending} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
