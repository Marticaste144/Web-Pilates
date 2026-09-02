"use client";

import { useActionState, type ReactNode } from "react";
import { guardarPruebasFuncionales } from "@/lib/fichas-evaluacion-actions";
import { initialFormState } from "@/lib/form-state";
import type { PruebasFuncionales } from "@/lib/fichas-evaluacion-data";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";

// Página 2 del PDF real (Pruebas funcionales) -- cada resultado queda en su
// propia columna de la base (no un textarea único), pero la UI se arma como
// tarjetas por prueba en vez de una tabla de Excel: en celular cada tarjeta
// apila sus campos en una columna, en desktop derecha/izquierda van lado a
// lado.
export function PruebasFuncionalesForm({
  alumnoId,
  pruebas,
  readOnly = false,
}: {
  alumnoId: string;
  pruebas: PruebasFuncionales | null;
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(guardarPruebasFuncionales, initialFormState);

  if (readOnly) {
    if (!pruebas) {
      return <p className="text-sm text-neutral-400">Sin pruebas funcionales cargadas.</p>;
    }
    return (
      <div className="flex flex-col gap-3 text-sm">
        <Prueba label="Elevación de pierna recta">
          <ValorDI derecha={pruebas.elevacionPiernaRectaDerecha} izquierda={pruebas.elevacionPiernaRectaIzquierda} />
          <Obs valor={pruebas.elevacionPiernaRectaObs} />
        </Prueba>
        <Prueba label="Flexión de tronco al frente">
          <p>{pruebas.flexionTroncoResultado || "--"}</p>
          <Obs valor={pruebas.flexionTroncoObs} />
        </Prueba>
        <Prueba label="Rotadores internos de cadera">
          <ValorDI derecha={pruebas.rotadoresCaderaDerecha} izquierda={pruebas.rotadoresCaderaIzquierda} />
          <Obs valor={pruebas.rotadoresCaderaObs} />
        </Prueba>
        <Prueba label="Equilibrio unipodal · ojos cerrados">
          <ValorDI
            derecha={pruebas.equilibrioCerradosDerechaSeg != null ? `${pruebas.equilibrioCerradosDerechaSeg}s` : null}
            izquierda={pruebas.equilibrioCerradosIzquierdaSeg != null ? `${pruebas.equilibrioCerradosIzquierdaSeg}s` : null}
          />
          <Obs valor={pruebas.equilibrioCerradosObs} />
        </Prueba>
        <Prueba label="Equilibrio unipodal · ojos abiertos">
          <ValorDI
            derecha={pruebas.equilibrioAbiertosDerechaSeg != null ? `${pruebas.equilibrioAbiertosDerechaSeg}s` : null}
            izquierda={pruebas.equilibrioAbiertosIzquierdaSeg != null ? `${pruebas.equilibrioAbiertosIzquierdaSeg}s` : null}
          />
          <Obs valor={pruebas.equilibrioAbiertosObs} />
        </Prueba>
        <Prueba label="Alcance de manos">
          <ValorDI derecha={pruebas.alcanceManosDerecha} izquierda={pruebas.alcanceManosIzquierda} />
          <Obs valor={pruebas.alcanceManosObs} />
        </Prueba>
        <Prueba label="Ángel en la pared · distancia">
          <ValorDI
            derecha={pruebas.angelParedDistanciaDerechaCm != null ? `${pruebas.angelParedDistanciaDerechaCm}cm` : null}
            izquierda={pruebas.angelParedDistanciaIzquierdaCm != null ? `${pruebas.angelParedDistanciaIzquierdaCm}cm` : null}
          />
          <Obs valor={pruebas.angelParedDistanciaObs} />
        </Prueba>
        <Prueba label="Ángel en la pared · apoyos">
          <p>
            Apoya nuca: {siNoLabel(pruebas.angelParedApoyaNuca)} · Apoya zona lumbar: {siNoLabel(pruebas.angelParedApoyaLumbar)}
          </p>
          <Obs valor={pruebas.angelParedApoyosObs} />
        </Prueba>
        <Prueba label="Observaciones generales">
          <p className="whitespace-pre-wrap">{pruebas.observacionesGenerales || "--"}</p>
        </Prueba>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="alumno_id" value={alumnoId} />

      <PruebaCampo label="Elevación de pierna recta">
        <CampoDI
          nombreDerecha="elevacion_pierna_recta_derecha"
          nombreIzquierda="elevacion_pierna_recta_izquierda"
          defaultDerecha={pruebas?.elevacionPiernaRectaDerecha}
          defaultIzquierda={pruebas?.elevacionPiernaRectaIzquierda}
        />
        <Input name="elevacion_pierna_recta_obs" placeholder="Observaciones" defaultValue={pruebas?.elevacionPiernaRectaObs ?? ""} />
      </PruebaCampo>

      <PruebaCampo label="Flexión de tronco al frente">
        <Input name="flexion_tronco_resultado" placeholder="Resultado / distancia" defaultValue={pruebas?.flexionTroncoResultado ?? ""} />
        <Input name="flexion_tronco_obs" placeholder="Observaciones" defaultValue={pruebas?.flexionTroncoObs ?? ""} />
      </PruebaCampo>

      <PruebaCampo label="Rotadores internos de cadera">
        <CampoDI
          nombreDerecha="rotadores_cadera_derecha"
          nombreIzquierda="rotadores_cadera_izquierda"
          defaultDerecha={pruebas?.rotadoresCaderaDerecha}
          defaultIzquierda={pruebas?.rotadoresCaderaIzquierda}
        />
        <Input name="rotadores_cadera_obs" placeholder="Observaciones" defaultValue={pruebas?.rotadoresCaderaObs ?? ""} />
      </PruebaCampo>

      <PruebaCampo label="Equilibrio unipodal · ojos cerrados">
        <CampoDI
          nombreDerecha="equilibrio_cerrados_derecha_seg"
          nombreIzquierda="equilibrio_cerrados_izquierda_seg"
          defaultDerecha={pruebas?.equilibrioCerradosDerechaSeg}
          defaultIzquierda={pruebas?.equilibrioCerradosIzquierdaSeg}
          tipo="number"
          sufijo="segundos"
        />
        <Input name="equilibrio_cerrados_obs" placeholder="Observaciones" defaultValue={pruebas?.equilibrioCerradosObs ?? ""} />
      </PruebaCampo>

      <PruebaCampo label="Equilibrio unipodal · ojos abiertos">
        <CampoDI
          nombreDerecha="equilibrio_abiertos_derecha_seg"
          nombreIzquierda="equilibrio_abiertos_izquierda_seg"
          defaultDerecha={pruebas?.equilibrioAbiertosDerechaSeg}
          defaultIzquierda={pruebas?.equilibrioAbiertosIzquierdaSeg}
          tipo="number"
          sufijo="segundos"
        />
        <Input name="equilibrio_abiertos_obs" placeholder="Observaciones" defaultValue={pruebas?.equilibrioAbiertosObs ?? ""} />
      </PruebaCampo>

      <PruebaCampo label="Alcance de manos">
        <CampoDI
          nombreDerecha="alcance_manos_derecha"
          nombreIzquierda="alcance_manos_izquierda"
          defaultDerecha={pruebas?.alcanceManosDerecha}
          defaultIzquierda={pruebas?.alcanceManosIzquierda}
        />
        <Input name="alcance_manos_obs" placeholder="Observaciones" defaultValue={pruebas?.alcanceManosObs ?? ""} />
      </PruebaCampo>

      <PruebaCampo label="Ángel en la pared · distancia">
        <CampoDI
          nombreDerecha="angel_pared_distancia_derecha_cm"
          nombreIzquierda="angel_pared_distancia_izquierda_cm"
          defaultDerecha={pruebas?.angelParedDistanciaDerechaCm}
          defaultIzquierda={pruebas?.angelParedDistanciaIzquierdaCm}
          tipo="number"
          sufijo="cm"
        />
        <Input name="angel_pared_distancia_obs" placeholder="Observaciones" defaultValue={pruebas?.angelParedDistanciaObs ?? ""} />
      </PruebaCampo>

      <PruebaCampo label="Ángel en la pared · apoyos">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Apoya nuca">
            <SelectSiNo name="angel_pared_apoya_nuca" defaultValue={pruebas?.angelParedApoyaNuca} />
          </Field>
          <Field label="Apoya zona lumbar">
            <SelectSiNo name="angel_pared_apoya_lumbar" defaultValue={pruebas?.angelParedApoyaLumbar} />
          </Field>
        </div>
        <Input name="angel_pared_apoyos_obs" placeholder="Observaciones" defaultValue={pruebas?.angelParedApoyosObs ?? ""} />
      </PruebaCampo>

      <Field label="Observaciones generales de las pruebas funcionales">
        <Textarea name="observaciones_generales" rows={3} defaultValue={pruebas?.observacionesGenerales ?? ""} />
      </Field>

      <FormAlert state={state} />
      <Button type="submit" size="sm" loading={pending} className="self-start">
        Guardar pruebas funcionales
      </Button>
    </form>
  );
}

function PruebaCampo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-100 bg-neutral-50/60 p-3">
      <p className="text-sm font-medium text-neutral-800">{label}</p>
      {children}
    </div>
  );
}

function CampoDI({
  nombreDerecha,
  nombreIzquierda,
  defaultDerecha,
  defaultIzquierda,
  tipo = "text",
  sufijo,
}: {
  nombreDerecha: string;
  nombreIzquierda: string;
  defaultDerecha?: string | number | null;
  defaultIzquierda?: string | number | null;
  tipo?: "text" | "number";
  sufijo?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={sufijo ? `Derecha (${sufijo})` : "Derecha"}>
        <Input type={tipo} step={tipo === "number" ? "0.1" : undefined} name={nombreDerecha} defaultValue={defaultDerecha ?? ""} />
      </Field>
      <Field label={sufijo ? `Izquierda (${sufijo})` : "Izquierda"}>
        <Input type={tipo} step={tipo === "number" ? "0.1" : undefined} name={nombreIzquierda} defaultValue={defaultIzquierda ?? ""} />
      </Field>
    </div>
  );
}

function SelectSiNo({ name, defaultValue }: { name: string; defaultValue?: boolean | null }) {
  const valor = defaultValue == null ? "" : defaultValue ? "si" : "no";
  return (
    <Select name={name} defaultValue={valor}>
      <option value="">Sin evaluar</option>
      <option value="si">Sí</option>
      <option value="no">No</option>
    </Select>
  );
}

function siNoLabel(valor: boolean | null): string {
  if (valor === true) return "Sí";
  if (valor === false) return "No";
  return "Sin evaluar";
}

function Prueba({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-100 p-3">
      <p className="mb-1 text-xs font-medium text-neutral-500">{label}</p>
      {children}
    </div>
  );
}

function ValorDI({ derecha, izquierda }: { derecha: string | null; izquierda: string | null }) {
  return (
    <p className="text-neutral-800">
      Derecha: {derecha || "--"} · Izquierda: {izquierda || "--"}
    </p>
  );
}

function Obs({ valor }: { valor: string | null }) {
  if (!valor) return null;
  return <p className="mt-1 text-xs text-neutral-500">{valor}</p>;
}
