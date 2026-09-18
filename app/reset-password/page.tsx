import { AuthShell } from "@/components/auth/auth-shell";
import { Alert } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

// Antes esta página renderizaba el form sin chequear nada -- cualquiera
// podía entrar directo a /reset-password sin haber pasado por un link de
// recuperación y ver el formulario (aunque no pudiera guardar nada sin
// sesión, updateUser fallaba recién al final, con un error genérico). Ahora
// se chequea acá que haya una sesión real ANTES de mostrar el formulario,
// para dar un mensaje claro ("pedí un link nuevo") en vez de un form que no
// va a funcionar.
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthShell heroTitle="Link inválido" heroSubtitle="Este link de recuperación no es válido o ya venció">
        <div className="flex flex-col gap-3">
          <Alert variant="error">
            No encontramos una sesión de recuperación activa. Pedí un nuevo link desde &quot;¿Olvidaste tu
            contraseña?&quot;.
          </Alert>
          <a href="/forgot-password" className="text-sm font-medium text-primary-600 hover:underline">
            Pedir un link nuevo
          </a>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell heroTitle="Ya casi" heroSubtitle="Elegí una contraseña nueva para tu cuenta">
      <ResetPasswordForm />
    </AuthShell>
  );
}
