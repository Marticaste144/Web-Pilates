"use client";

import { useActionState, useState } from "react";
import { updatePassword } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/auth-state";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialAuthState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <div className="mb-6 text-center md:text-left">
        <h1 className="text-2xl font-bold text-neutral-900">Elegí una contraseña nueva</h1>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Contraseña nueva
          <span className="relative flex items-center">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-xl border border-transparent bg-neutral-100 px-4 py-3 pr-11 text-neutral-900 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-3 text-neutral-400 hover:text-neutral-600"
            >
              {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </span>
        </label>

        {state.status === "error" && <Alert variant="error">{state.message}</Alert>}

        <Button type="submit" loading={pending} className="mt-2 w-full">
          {pending ? "Guardando..." : "Guardar contraseña"}
        </Button>
      </form>
    </>
  );
}
