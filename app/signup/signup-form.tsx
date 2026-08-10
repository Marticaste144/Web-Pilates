"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUpAlumno } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/auth-state";

const inputClass =
  "rounded-xl border border-transparent bg-slate-100 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-[#2f7cd6] focus:bg-white focus:outline-none";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAlumno, initialAuthState);
  const [showPassword, setShowPassword] = useState(false);

  if (state.status === "check_email") {
    return (
      <>
        <div className="mb-6 text-center md:text-left">
          <h1 className="text-2xl font-bold text-slate-900">Revisá tu email</h1>
        </div>
        <p className="text-slate-600">{state.message}</p>
      </>
    );
  }

  return (
    <>
      <div className="mb-6 text-center md:text-left">
        <h1 className="text-2xl font-bold text-slate-900">Crear cuenta nueva</h1>
        <p className="mt-1 text-slate-500">Sumate para reservar tus clases</p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-slate-700">
            Nombre
            <input name="nombre" required className={`min-w-0 ${inputClass}`} />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-slate-700">
            Apellido
            <input name="apellido" required className={`min-w-0 ${inputClass}`} />
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
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

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Teléfono (opcional)
          <input name="telefono" className={inputClass} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
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
          {pending ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          o
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <Link
          href="/login"
          className="rounded-xl border border-slate-300 py-3 text-center font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Ya tengo cuenta
        </Link>
      </form>
    </>
  );
}
