"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/auth-state";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialAuthState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Contraseña
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="rounded border border-slate-300 px-3 py-2"
        />
      </label>

      {state.status === "error" && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Ingresando..." : "Ingresar"}
      </button>

      <p className="text-center text-sm text-slate-500">
        ¿No tenés cuenta?{" "}
        <Link href="/signup" className="underline">
          Crear cuenta nueva
        </Link>
      </p>
    </form>
  );
}
