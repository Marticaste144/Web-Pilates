import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <AuthShell heroTitle="Ya casi" heroSubtitle="Elegí una contraseña nueva para tu cuenta">
      <ResetPasswordForm />
    </AuthShell>
  );
}
