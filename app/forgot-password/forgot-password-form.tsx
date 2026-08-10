"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/auth-state";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialAuthState);

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
        <h1 className="text-2xl font-bold text-slate-900">Recuperar contraseña</h1>
        <p className="mt-1 text-slate-500">Te enviamos un link para restablecerla</p>
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

        {state.status === "error" && (
          <p className="text-sm text-red-600">{state.message}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-xl bg-[#2f7cd6] py-3 font-semibold text-white transition-colors hover:bg-[#2568b8] disabled:opacity-50"
        >
          {pending ? "Enviando..." : "Enviar link"}
        </button>

        <Link href="/login" className="text-center text-sm font-medium text-[#2f7cd6] hover:underline">
          Volver a iniciar sesión
        </Link>
      </form>
    </>
  );
}
