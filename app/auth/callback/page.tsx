"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Los links de invitación (auth.admin.inviteUserByEmail) NO soportan el
// flujo PKCE que usa /auth/confirm (documentado así en supabase-js: el
// navegador que manda la invitación no es el mismo que la acepta). Vienen
// con los tokens en el hash de la URL (#access_token=...), que solo el
// browser puede leer -- por eso esto es un Client Component y no una route
// handler. El cliente de Supabase los detecta solo al inicializarse.
export default function AuthCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        setFailed(true);
        return;
      }
      router.replace("/reset-password");
    });
  }, [router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      {failed ? (
        <>
          <p className="font-semibold text-slate-900">El link no es válido o ya expiró.</p>
          <a href="/login" className="text-sm text-[#2f7cd6] hover:underline">
            Volver a iniciar sesión
          </a>
        </>
      ) : (
        <p className="text-slate-500">Ingresando...</p>
      )}
    </main>
  );
}
