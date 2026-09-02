"use client";

import { useState, useTransition } from "react";
import {
  agregarDia,
  renombrarDia,
  eliminarDia,
  moverDia,
  guardarEstiramientosDia,
  agregarBloque,
  renombrarBloque,
  eliminarBloque,
  moverBloque,
  agregarEjercicio,
  renombrarEjercicio,
  eliminarEjercicio,
  moverEjercicio,
  guardarSemanaEjercicio,
} from "@/lib/planificaciones-actions";
import type {
  PlanificacionCompleta,
  DiaPlanificacion,
  BloquePlanificacion,
  EjercicioPlanificacion,
} from "@/lib/planificaciones-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ChevronDownIcon } from "@/components/ui/icons";

// Vista del árbol completo días > bloques > ejercicios > semanas. `readOnly`
// se usa para versiones históricas -- la RLS ya bloquea cualquier escritura
// sobre ellas (no es solo un botón oculto), pero acá igual no se muestran
// los controles de edición para no invitar a un click que el server va a
// rechazar. La estructura (qué días/bloques/ejercicios hay) viene siempre de
// `plan` (prop del server) -- cada acción dispara revalidatePath, así que el
// próximo render ya trae la lista actualizada sin manejo local de estado.
export function PlanificacionView({ plan, readOnly }: { plan: PlanificacionCompleta; readOnly: boolean }) {
  const [diaId, setDiaId] = useState<string | null>(plan.dias[0]?.id ?? null);
  const dia = plan.dias.find((d) => d.id === diaId) ?? plan.dias[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {plan.dias.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDiaId(d.id)}
            className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              d.id === (dia?.id ?? "")
                ? "border-primary-600 bg-primary-600 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-primary-300"
            }`}
          >
            {d.nombre}
          </button>
        ))}
        {!readOnly && <AgregarDiaBoton planificacionId={plan.id} onAgregado={setDiaId} />}
      </div>

      {!dia ? (
        <p className="rounded-xl bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
          {readOnly ? "Esta versión no tiene días cargados." : "Agregá el primer día para empezar a cargar la planificación."}
        </p>
      ) : (
        <DiaPanel key={dia.id} dia={dia} maxSemana={plan.maxSemana} readOnly={readOnly} onDiaSeleccionado={setDiaId} />
      )}
    </div>
  );
}

function AgregarDiaBoton({ planificacionId, onAgregado }: { planificacionId: string; onAgregado: (id: string) => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await agregarDia(planificacionId, "");
          void onAgregado; // el id del nuevo día se ve en la próxima lista de tabs; no hace falta seleccionarlo automático
          if (!result.ok) alert(result.message);
        })
      }
      className="shrink-0 rounded-xl border border-dashed border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-500 transition-colors hover:border-primary-400 hover:text-primary-600 disabled:opacity-50"
    >
      + Día
    </button>
  );
}

function DiaPanel({
  dia,
  maxSemana,
  readOnly,
  onDiaSeleccionado,
}: {
  dia: DiaPlanificacion;
  maxSemana: number;
  readOnly: boolean;
  onDiaSeleccionado: (id: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [editandoEstiramientos, setEditandoEstiramientos] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {editandoNombre ? (
            <RenombrarInline
              valorInicial={dia.nombre}
              onGuardar={async (v) => {
                const r = await renombrarDia(dia.id, v);
                setEditandoNombre(false);
                return r;
              }}
              onCancelar={() => setEditandoNombre(false)}
            />
          ) : (
            <button type="button" onClick={() => setEditandoNombre(true)} className="font-medium text-primary-600 hover:underline">
              Renombrar día
            </button>
          )}
          <MoverBotones
            onMover={(dir) =>
              startTransition(async () => {
                await moverDia(dia.id, dir);
              })
            }
            pending={pending}
          />
          <ConfirmButton
            action={async () => {
              const r = await eliminarDia(dia.id);
              if (r.ok) onDiaSeleccionado(null);
              return r;
            }}
            triggerLabel="Eliminar día"
            confirmTitle={`¿Eliminar "${dia.nombre}"?`}
            confirmDescription="Se borran también sus bloques, ejercicios y semanas. No se puede deshacer."
            confirmLabel="Sí, eliminar"
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {dia.bloques.map((bloque) => (
          <BloqueCard key={bloque.id} bloque={bloque} maxSemana={maxSemana} readOnly={readOnly} />
        ))}
      </div>

      {!readOnly && <AgregarBloqueForm diaId={dia.id} />}

      <Card className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Estiramientos</p>
        {readOnly ? (
          <p className="text-sm text-neutral-600">{dia.estiramientos || "Sin estiramientos cargados."}</p>
        ) : editandoEstiramientos ? (
          <EstiramientosForm diaId={dia.id} valorInicial={dia.estiramientos} onListo={() => setEditandoEstiramientos(false)} />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-neutral-600">{dia.estiramientos || "Sin estiramientos cargados."}</p>
            <button
              type="button"
              onClick={() => setEditandoEstiramientos(true)}
              className="text-xs font-medium text-primary-600 hover:underline"
            >
              Editar
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

function EstiramientosForm({
  diaId,
  valorInicial,
  onListo,
}: {
  diaId: string;
  valorInicial: string | null;
  onListo: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [valor, setValor] = useState(valorInicial ?? "");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Textarea rows={2} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ej. Rotadores, isquiotibiales, rodillo" />
      {error && <p className="text-xs text-error-600">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await guardarEstiramientosDia(diaId, valor);
              if (!r.ok) setError(r.message);
              else onListo();
            })
          }
        >
          Guardar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onListo}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function AgregarBloqueForm({ diaId }: { diaId: string }) {
  const [pending, startTransition] = useTransition();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await agregarBloque(diaId, nombre);
          if (!r.ok) setError(r.message);
          else setNombre("");
        });
      }}
    >
      <Input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej. Acondicionamiento, Bloque 1..."
        className="max-w-xs"
      />
      <Button type="submit" size="sm" variant="secondary" loading={pending}>
        + Bloque
      </Button>
      {error && <p className="text-xs text-error-600">{error}</p>}
    </form>
  );
}

function BloqueCard({
  bloque,
  maxSemana,
  readOnly,
}: {
  bloque: BloquePlanificacion;
  maxSemana: number;
  readOnly: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [editandoNombre, setEditandoNombre] = useState(false);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2">
        {editandoNombre ? (
          <RenombrarInline
            valorInicial={bloque.nombre}
            onGuardar={async (v) => {
              const r = await renombrarBloque(bloque.id, v);
              setEditandoNombre(false);
              return r;
            }}
            onCancelar={() => setEditandoNombre(false)}
          />
        ) : (
          <h3 className="font-semibold text-neutral-900">{bloque.nombre}</h3>
        )}

        {!readOnly && !editandoNombre && (
          <div className="flex items-center gap-2 text-xs">
            <button type="button" onClick={() => setEditandoNombre(true)} className="font-medium text-primary-600 hover:underline">
              Renombrar
            </button>
            <MoverBotones
              onMover={(dir) =>
                startTransition(async () => {
                  await moverBloque(bloque.id, dir);
                })
              }
              pending={pending}
            />
            <ConfirmButton
              action={() => eliminarBloque(bloque.id)}
              triggerLabel="Eliminar"
              confirmTitle={`¿Eliminar "${bloque.nombre}"?`}
              confirmDescription="Se borran también sus ejercicios y semanas. No se puede deshacer."
              confirmLabel="Sí, eliminar"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {bloque.ejercicios.length === 0 && <p className="text-sm text-neutral-400">Todavía no hay ejercicios en este bloque.</p>}
        {bloque.ejercicios.map((ejercicio) => (
          <EjercicioRow key={ejercicio.id} ejercicio={ejercicio} maxSemana={maxSemana} readOnly={readOnly} />
        ))}
      </div>

      {!readOnly && <AgregarEjercicioForm bloqueId={bloque.id} />}
    </Card>
  );
}

function AgregarEjercicioForm({ bloqueId }: { bloqueId: string }) {
  const [pending, startTransition] = useTransition();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await agregarEjercicio(bloqueId, nombre);
          if (!r.ok) setError(r.message);
          else setNombre("");
        });
      }}
    >
      <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del ejercicio" className="max-w-xs" required />
      <Button type="submit" size="sm" variant="secondary" loading={pending}>
        + Ejercicio
      </Button>
      {error && <p className="text-xs text-error-600">{error}</p>}
    </form>
  );
}

function EjercicioRow({
  ejercicio,
  maxSemana,
  readOnly,
}: {
  ejercicio: EjercicioPlanificacion;
  maxSemana: number;
  readOnly: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [editandoNombre, setEditandoNombre] = useState(false);
  const semanaInicial = ejercicio.semanas.length > 0 ? Math.max(...ejercicio.semanas.map((s) => s.numeroSemana)) : 1;
  const [semanaExtra, setSemanaExtra] = useState(0); // "+ agregar semana" más allá del máximo global, antes de guardar nada
  const [semanaSel, setSemanaSel] = useState(semanaInicial);

  const totalSemanas = Math.max(maxSemana, semanaInicial) + semanaExtra;
  const semanaActual = ejercicio.semanas.find((s) => s.numeroSemana === semanaSel) ?? null;

  return (
    <div className="rounded-xl border border-neutral-100 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {editandoNombre ? (
          <RenombrarInline
            valorInicial={ejercicio.nombre}
            onGuardar={async (v) => {
              const r = await renombrarEjercicio(ejercicio.id, v);
              setEditandoNombre(false);
              return r;
            }}
            onCancelar={() => setEditandoNombre(false)}
          />
        ) : (
          <p className="font-medium text-neutral-900">{ejercicio.nombre}</p>
        )}

        {!readOnly && !editandoNombre && (
          <div className="flex items-center gap-2 text-xs">
            <button type="button" onClick={() => setEditandoNombre(true)} className="font-medium text-primary-600 hover:underline">
              Renombrar
            </button>
            <MoverBotones
              onMover={(dir) =>
                startTransition(async () => {
                  await moverEjercicio(ejercicio.id, dir);
                })
              }
              pending={pending}
            />
            <ConfirmButton
              action={() => eliminarEjercicio(ejercicio.id)}
              triggerLabel="Eliminar"
              confirmTitle={`¿Eliminar "${ejercicio.nombre}"?`}
              confirmDescription="Se borran también todas sus semanas cargadas. No se puede deshacer."
              confirmLabel="Sí, eliminar"
            />
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {Array.from({ length: totalSemanas }, (_, i) => i + 1).map((n) => {
          const tieneValores = ejercicio.semanas.some((s) => s.numeroSemana === n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => setSemanaSel(n)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                n === semanaSel
                  ? "bg-secondary-500 text-white"
                  : tieneValores
                    ? "bg-secondary-50 text-secondary-700 hover:bg-secondary-100"
                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              }`}
            >
              Semana {n}
            </button>
          );
        })}
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              setSemanaExtra((v) => v + 1);
              setSemanaSel(totalSemanas + 1);
            }}
            className="rounded-lg border border-dashed border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-500 hover:border-primary-400 hover:text-primary-600"
          >
            + Semana
          </button>
        )}
      </div>

      <div className="mt-3">
        {readOnly ? (
          <SemanaResumenLectura semana={semanaActual} />
        ) : (
          <SemanaForm ejercicioId={ejercicio.id} numeroSemana={semanaSel} valores={semanaActual} />
        )}
      </div>
    </div>
  );
}

function SemanaResumenLectura({ semana }: { semana: EjercicioPlanificacion["semanas"][number] | null }) {
  if (!semana) return <p className="text-xs text-neutral-400">Sin datos cargados para esta semana.</p>;
  const partes = [
    semana.carga && `Carga: ${semana.carga}`,
    semana.series && `Series: ${semana.series}`,
    semana.repeticiones && `Reps: ${semana.repeticiones}`,
    semana.tiempo && `Tiempo: ${semana.tiempo}`,
    semana.pse && `PSE: ${semana.pse}`,
  ].filter(Boolean);
  return (
    <div className="flex flex-col gap-1 text-sm text-neutral-700">
      <p>{partes.length > 0 ? partes.join(" · ") : "Sin datos cargados para esta semana."}</p>
      {semana.observaciones && <p className="text-xs text-neutral-500">{semana.observaciones}</p>}
    </div>
  );
}

function SemanaForm({
  ejercicioId,
  numeroSemana,
  valores,
}: {
  ejercicioId: string;
  numeroSemana: number;
  valores: EjercicioPlanificacion["semanas"][number] | null;
}) {
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  return (
    <form
      key={`${ejercicioId}-${numeroSemana}`}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setMensaje(null);
        startTransition(async () => {
          const r = await guardarSemanaEjercicio(ejercicioId, numeroSemana, formData);
          setMensaje(r.message);
        });
      }}
    >
      <Input name="carga" placeholder="Carga/Kg" defaultValue={valores?.carga ?? ""} className="text-sm" />
      <Input name="series" placeholder="Series" defaultValue={valores?.series ?? ""} className="text-sm" />
      <Input name="repeticiones" placeholder="Reps" defaultValue={valores?.repeticiones ?? ""} className="text-sm" />
      <Input name="tiempo" placeholder="Tiempo" defaultValue={valores?.tiempo ?? ""} className="text-sm" />
      <Input name="pse" placeholder="PSE" defaultValue={valores?.pse ?? ""} className="text-sm" />
      <div className="col-span-2 flex items-center gap-2 sm:col-span-3 lg:col-span-1">
        <Button type="submit" size="sm" loading={pending} className="w-full">
          Guardar
        </Button>
      </div>
      <Textarea
        name="observaciones"
        placeholder="Observaciones de esta semana (opcional)"
        defaultValue={valores?.observaciones ?? ""}
        rows={1}
        className="col-span-2 text-sm sm:col-span-3 lg:col-span-6"
      />
      {mensaje && <p className="col-span-2 text-xs text-neutral-500 sm:col-span-3 lg:col-span-6">{mensaje}</p>}
    </form>
  );
}

function MoverBotones({ onMover, pending }: { onMover: (dir: "arriba" | "abajo") => void; pending: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => onMover("arriba")}
        aria-label="Mover arriba"
        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50"
      >
        <ChevronDownIcon className="h-3.5 w-3.5 rotate-180" />
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => onMover("abajo")}
        aria-label="Mover abajo"
        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50"
      >
        <ChevronDownIcon className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function RenombrarInline({
  valorInicial,
  onGuardar,
  onCancelar,
}: {
  valorInicial: string;
  onGuardar: (valor: string) => Promise<{ ok: boolean; message: string }>;
  onCancelar: () => void;
}) {
  const [valor, setValor] = useState(valorInicial);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="h-8 max-w-[180px] py-1 text-sm"
        autoFocus
      />
      <Button
        type="button"
        size="sm"
        loading={pending}
        onClick={() =>
          startTransition(() => {
            void onGuardar(valor);
          })
        }
      >
        OK
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancelar}>
        X
      </Button>
    </div>
  );
}
