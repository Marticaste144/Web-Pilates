import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <AuthShell heroTitle="¿Olvidaste tu contraseña?" heroSubtitle="Te ayudamos a recuperarla en un par de pasos">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
