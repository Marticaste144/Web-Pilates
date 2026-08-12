"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/auth-state";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialAuthState);

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
        <h1 className="text-2xl font-bold text-neutral-900">Recuperar contraseña</h1>
        <p className="mt-1 text-neutral-500">Te enviamos un link para restablecerla</p>
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
            className="w-full rounded-xl border border-transparent bg-neutral-100 px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>

        {state.status === "error" && <Alert variant="error">{state.message}</Alert>}

        <Button type="submit" loading={pending} className="mt-2 w-full">
          {pending ? "Enviando..." : "Enviar link"}
        </Button>

        <Link href="/login" className="text-center text-sm font-medium text-primary-600 hover:underline">
          Volver a iniciar sesión
        </Link>
      </form>
    </>
  );
}
