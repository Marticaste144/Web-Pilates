"use client";

import { useActionState, useRef, useEffect } from "react";
import { invitarProfesor } from "@/lib/admin/profesores-actions";
import { initialFormState } from "@/lib/form-state";

const inputClass =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#2f7cd6] focus:outline-none";

export function InvitarProfesorForm() {
  const [state, formAction, pending] = useActionState(invitarProfesor, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
      <h2 className="font-semibold text-slate-900">Invitar profesor/a</h2>
      <div className="flex flex-wrap gap-3">
        <input name="nombre" placeholder="Nombre" required className={inputClass} />
        <input name="apellido" placeholder="Apellido" required className={inputClass} />
        <input name="email" type="email" placeholder="email@ejemplo.com" required className={inputClass} />
        <input name="telefono" placeholder="Teléfono (opcional)" className={inputClass} />
      </div>

      {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      {state.status === "success" && <p className="text-sm text-emerald-600">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-[#2f7cd6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2568b8] disabled:opacity-50"
      >
        {pending ? "Enviando invitación..." : "Enviar invitación"}
      </button>
    </form>
  );
}
