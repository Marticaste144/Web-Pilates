import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import type { CurrentProfile } from "@/lib/auth/session";
import { Isotipo } from "@/components/ui/isotipo";
import { LogOutIcon } from "@/components/ui/icons";

const LABEL_BY_ROLE: Record<CurrentProfile["role"], string> = {
  admin: "Admin",
  profesor: "Profesor/a",
  alumno: "Alumno/a",
};

export function RoleShell({
  profile,
  nav,
  children,
}: {
  profile: CurrentProfile;
  nav: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Isotipo className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              {LABEL_BY_ROLE[profile.role]}
            </p>
            <p className="truncate font-semibold text-neutral-900">
              {profile.nombre} {profile.apellido}
            </p>
          </div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
          >
            <LogOutIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </form>
      </header>
      {nav}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-4 pb-24 sm:pb-8">
        {children}
        <footer className="mt-8 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-400">
          <Link href="/legal" className="hover:text-primary-600 hover:underline">
            Términos y Condiciones y Política de Privacidad
          </Link>
        </footer>
      </div>
    </div>
  );
}
