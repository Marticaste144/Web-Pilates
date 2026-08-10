import { redirect } from "next/navigation";
import { getCurrentProfile, homePathForRole } from "@/lib/auth/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(homePathForRole(profile.role));
  }

  return (
    <AuthShell heroTitle="¡Sumate a MUV!" heroSubtitle="Creá tu cuenta para empezar a reservar tus clases">
      <SignupForm />
    </AuthShell>
  );
}
