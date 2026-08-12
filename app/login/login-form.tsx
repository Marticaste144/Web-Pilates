"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/auth-state";
import { Button, LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";

const inputClass =
  "w-full rounded-xl border border-transparent bg-neutral-100 px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialAuthState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <div className="mb-6 text-center md:text-left">
        <h1 className="text-2xl font-bold text-neutral-900">Iniciar sesión</h1>
        <p className="mt-1 text-neutral-500">Ingresá para ver tus clases</p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="nombre@email.com"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Contraseña
          <span className="relative flex items-center">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              autoComplete="current-password"
              className={`pr-11 ${inputClass}`}
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

        <div className="flex items-center justify-between text-sm">
          <label className="hidden items-center gap-2 text-neutral-600 md:flex">
            <input type="checkbox" name="recordarme" className="h-4 w-4 rounded border-neutral-300" />
            Recordarme
          </label>
          <Link href="/forgot-password" className="ml-auto font-medium text-primary-600 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {state.status === "error" && <Alert variant="error">{state.message}</Alert>}

        <Button type="submit" loading={pending} className="mt-2 w-full">
          {pending ? "Ingresando..." : "Ingresar"}
        </Button>

        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          o
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <LinkButton href="/signup" variant="secondary" className="w-full">
          Crear cuenta nueva
        </LinkButton>
      </form>
    </>
  );
}
