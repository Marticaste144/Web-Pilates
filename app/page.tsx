import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, homePathForRole } from "@/lib/auth/session";

// Depende de la sesión (cookies): nunca debe quedar cacheada como estática.
export const dynamic = "force-dynamic";

export default async function Home() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(homePathForRole(profile.role));
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold text-slate-900">MUV Gimnasia Postural</h1>
      <p className="text-slate-500">
        Proyecto en construcción — estructura inicial + Supabase configurado.
      </p>
      <div className="flex gap-4">
        <Link href="/login" className="rounded bg-slate-900 px-4 py-2 text-white">
          Iniciar sesión
        </Link>
        <Link href="/signup" className="rounded border border-slate-300 px-4 py-2">
          Crear cuenta nueva
        </Link>
      </div>
    </main>
  );
}
