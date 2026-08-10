import { redirect } from "next/navigation";
import { getCurrentProfile, homePathForRole } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(homePathForRole(profile.role));
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Iniciar sesión</h1>
        <p className="text-slate-500">MUV Gimnasia Postural</p>
      </div>
      <LoginForm />
    </main>
  );
}
