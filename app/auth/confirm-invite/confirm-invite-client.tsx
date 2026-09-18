"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Isotipo } from "@/components/ui/isotipo";

// A propósito NO se confirma sola al cargar la página (a diferencia del
// viejo /auth/callback, que sí lo hacía) -- esta es la mitigación real
// contra los escáneres de seguridad de los clientes de mail (Gmail,
// Outlook Safe Links, etc.) que pre-visitan automáticamente los links de un
// email para chequearlos. El token de invitación es de un solo uso: si se
// consumiera solo con cargar la página (un GET), el escáner se lo gastaría
// antes de que la persona real llegue a hacer click, y el link real
// siempre fallaría con "no es válido o ya expiró". Un bot no hace click en
// un botón ni ejecuta el verifyOtp() de acá abajo, así que el token
// sobrevive hasta que la persona real lo confirma.
//
// Acepta type=invite (primera invitación) o type=recovery (reenviarInvitacion,
// profesores-actions.ts -- Supabase no permite generar otro type=invite para
// un email que ya existe, así que un reenvío usa recovery con el MISMO
// usuario). Ambos casos terminan igual: verifyOtp abre sesión y se manda a
// /reset-password a elegir contraseña, sea la primera vez o no.
const TIPOS_VALIDOS = ["invite", "recovery"] as const;
type TipoValido = (typeof TIPOS_VALIDOS)[number];

function esTipoValido(type: string | null): type is TipoValido {
  return TIPOS_VALIDOS.includes(type as TipoValido);
}

export function ConfirmInviteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const esRecuperacion = searchParams.get("flow") === "reset";
  const linkInvalido = !tokenHash || !esTipoValido(type);

  const confirmar = async () => {
    if (!tokenHash || !esTipoValido(type)) {
      setError("El link no es válido o ya expiró.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (verifyError) {
      setError("El link no es válido o ya expiró.");
      setPending(false);
      return;
    }

    router.replace("/reset-password");
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-neutral-50 p-8 text-center">
      <Isotipo className="h-14 w-14" />
      <div className="max-w-xs">
        <h1 className="text-xl font-bold text-neutral-900">
          {esRecuperacion ? "Recuperar tu contraseña" : "Te invitaron a MUV Gimnasia Postural"}
        </h1>
        <p className="mt-1 text-neutral-500">
          {esRecuperacion ? "Confirmá para elegir una contraseña nueva." : "Confirmá tu cuenta para elegir tu contraseña."}
        </p>
      </div>

      {error || linkInvalido ? (
        <div className="flex max-w-xs flex-col items-center gap-3">
          <Alert variant="error">{error ?? "El link no es válido o ya expiró."}</Alert>
          <a
            href={esRecuperacion ? "/forgot-password" : "/login"}
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            {esRecuperacion ? "Pedir un link nuevo" : "Volver a iniciar sesión"}
          </a>
        </div>
      ) : (
        <Button onClick={confirmar} loading={pending}>
          {esRecuperacion ? "Continuar" : "Confirmar cuenta"}
        </Button>
      )}
    </main>
  );
}
