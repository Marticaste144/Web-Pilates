"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/auth-state";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialAuthState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <div className="mb-6 text-center md:text-left">
        <h1 className="text-2xl font-bold text-slate-900">Iniciar sesión</h1>
        <p className="mt-1 text-slate-500">Ingresá para ver tus clases</p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="nombre@email.com"
            className="rounded-xl border border-transparent bg-slate-100 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-[#2f7cd6] focus:bg-white focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Contraseña
          <span className="relative flex items-center">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              autoComplete="current-password"
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

        <div className="flex items-center justify-between text-sm">
          <label className="hidden items-center gap-2 text-slate-600 md:flex">
            <input type="checkbox" name="recordarme" className="h-4 w-4 rounded border-slate-300" />
            Recordarme
          </label>
          <Link href="/forgot-password" className="ml-auto font-medium text-[#2f7cd6] hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {state.status === "error" && (
          <p className="text-sm text-red-600">{state.message}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-xl bg-[#2f7cd6] py-3 font-semibold text-white transition-colors hover:bg-[#2568b8] disabled:opacity-50"
        >
          {pending ? "Ingresando..." : "Ingresar"}
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          o
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <Link
          href="/signup"
          className="rounded-xl border border-slate-300 py-3 text-center font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Crear cuenta nueva
        </Link>
      </form>
    </>
  );
}
