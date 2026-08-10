import { redirect } from "next/navigation";
import { getCurrentProfile, homePathForRole } from "@/lib/auth/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(homePathForRole(profile.role));
  }

  return (
    <AuthShell heroTitle="¡Bienvenido/a!" heroSubtitle="Ingresá para gestionar tus clases y turnos">
      <LoginForm />
    </AuthShell>
  );
}
