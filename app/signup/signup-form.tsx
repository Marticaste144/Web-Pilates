"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAlumno } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/auth-state";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAlumno, initialAuthState);

  if (state.status === "check_email") {
    return (
      <p className="max-w-sm text-center text-slate-700">{state.message}</p>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Nombre
          <input name="nombre" required className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Apellido
          <input name="apellido" required className="rounded border border-slate-300 px-3 py-2" />
        </label>
      </div>
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
        Teléfono (opcional)
        <input name="telefono" className="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Contraseña
        <input
          type="password"
          name="password"
          required
          minLength={6}
          autoComplete="new-password"
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
        {pending ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <p className="text-center text-sm text-slate-500">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="underline">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
