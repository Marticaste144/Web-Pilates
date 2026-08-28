"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUpAlumno } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/auth-state";
import { Button, LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";

const inputClass =
  "rounded-xl border border-transparent bg-neutral-100 px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAlumno, initialAuthState);
  const [showPassword, setShowPassword] = useState(false);

  if (state.status === "check_email") {
    return (
      <>
        <div className="mb-6 text-center md:text-left">
          <h1 className="text-2xl font-bold text-neutral-900">Revisá tu email</h1>
        </div>
        <Alert variant="success">{state.message}</Alert>
      </>
    );
  }

  return (
    <>
      <div className="mb-6 text-center md:text-left">
        <h1 className="text-2xl font-bold text-neutral-900">Crear cuenta nueva</h1>
        <p className="mt-1 text-neutral-500">Sumate para reservar tus clases</p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Nombre
            <input name="nombre" required className={`min-w-0 w-full ${inputClass}`} />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Apellido
            <input name="apellido" required className={`min-w-0 w-full ${inputClass}`} />
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="nombre@email.com"
            className={`w-full ${inputClass}`}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Teléfono (opcional)
          <input name="telefono" className={`w-full ${inputClass}`} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Contraseña
          <span className="relative flex items-center">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={`w-full pr-11 ${inputClass}`}
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

        <label className="flex items-start gap-2.5 text-sm text-neutral-600">
          <input
            type="checkbox"
            name="acepta_terminos"
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-primary-600 focus:ring-primary-400"
          />
          <span>
            Acepto los{" "}
            <Link href="/legal#terminos" target="_blank" className="font-medium text-primary-600 hover:underline">
              Términos y Condiciones
            </Link>{" "}
            y la{" "}
            <Link href="/legal#privacidad" target="_blank" className="font-medium text-primary-600 hover:underline">
              Política de Privacidad
            </Link>
          </span>
        </label>

        {state.status === "error" && <Alert variant="error">{state.message}</Alert>}

        <Button type="submit" loading={pending} className="mt-2 w-full">
          {pending ? "Creando cuenta..." : "Crear cuenta"}
        </Button>

        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          o
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <LinkButton href="/login" variant="secondary" className="w-full">
          Ya tengo cuenta
        </LinkButton>
      </form>
    </>
  );
}
