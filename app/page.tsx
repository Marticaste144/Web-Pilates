import { redirect } from "next/navigation";
import { getCurrentProfile, homePathForRole } from "@/lib/auth/session";
import { Isotipo } from "@/components/ui/isotipo";
import { LinkButton } from "@/components/ui/button";

// Depende de la sesión (cookies): nunca debe quedar cacheada como estática.
export const dynamic = "force-dynamic";

export default async function Home() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(homePathForRole(profile.role));
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 bg-neutral-50 p-8 text-center">
      <Isotipo className="h-16 w-16" />
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">MUV Gimnasia Postural</h1>
        <p className="mt-1 text-neutral-500">Gestión de clases, cuotas y avisos.</p>
      </div>
      <div className="flex gap-3">
        <LinkButton href="/login" variant="primary" className="px-6">
          Iniciar sesión
        </LinkButton>
        <LinkButton href="/signup" variant="secondary" className="px-6">
          Crear cuenta nueva
        </LinkButton>
      </div>
    </main>
  );
}
