"use client";

import { useState, useTransition } from "react";
import { Button } from "./button";

type ActionResult = { ok: boolean; message: string };

// Botón para acciones que conviene confirmar antes de disparar: antes de
// ejecutar la Server Action, muestra un diálogo de confirmación propio (no
// window.confirm, para que se vea consistente con el resto de la UI) con
// Cancelar/Confirmar. `tone` controla el color -- "destructive" (default,
// mismo comportamiento de siempre) para bajas/eliminar; "primary" para
// confirmaciones de una acción positiva pero que igual conviene chequear
// antes de disparar (ej. marcar un pago en efectivo), donde un botón rojo
// daría la señal visual equivocada.
export function ConfirmButton({
  action,
  triggerLabel,
  pendingLabel = "...",
  confirmTitle,
  confirmDescription,
  confirmLabel = "Confirmar",
  variant = "link",
  tone = "destructive",
  className = "",
  onResult,
}: {
  action: () => Promise<ActionResult>;
  triggerLabel: string;
  pendingLabel?: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmLabel?: string;
  variant?: "link" | "button";
  tone?: "destructive" | "primary";
  className?: string;
  onResult?: (result: ActionResult) => void;
}) {
  const linkColor = tone === "destructive" ? "text-error-600" : "text-primary-600";
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const confirmar = () => {
    setOpen(false);
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
      onResult?.(result);
    });
  };

  return (
    <>
      {variant === "link" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(true)}
          className={`text-xs font-medium hover:underline disabled:opacity-50 ${linkColor} ${className}`}
        >
          {pending ? pendingLabel : triggerLabel}
        </button>
      ) : (
        <Button
          variant={tone === "destructive" ? "destructive" : "primary"}
          size="sm"
          loading={pending}
          onClick={() => setOpen(true)}
          className={className}
        >
          {triggerLabel}
        </Button>
      )}

      {message && <p className="mt-1 text-xs text-neutral-500">{message}</p>}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/40 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold text-neutral-900">{confirmTitle}</p>
            <p className="mt-1 text-sm text-neutral-500">{confirmDescription}</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button variant={tone === "destructive" ? "destructive" : "primary"} size="sm" onClick={confirmar}>
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
