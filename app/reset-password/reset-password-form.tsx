"use client";

import { useActionState, useState } from "react";
import { updatePassword } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/auth-state";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialAuthState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <div className="mb-6 text-center md:text-left">
        <h1 className="text-2xl font-bold text-slate-900">Elegí una contraseña nueva</h1>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Contraseña nueva
          <span className="relative flex items-center">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-xl border border-transparent bg-slate-100 px-4 py-3 pr-11 text-slate-900 focus:border-[#2f7cd6] focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-3 h-5 w-5 rounded-full border-2 border-slate-300"
            />
          </span>
        </label>

        {state.status === "error" && (
          <p className="text-sm text-red-600">{state.message}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-xl bg-[#2f7cd6] py-3 font-semibold text-white transition-colors hover:bg-[#2568b8] disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </>
  );
}
