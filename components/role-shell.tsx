import type { ReactNode } from "react";
import { signOut } from "@/lib/auth/actions";
import type { CurrentProfile } from "@/lib/auth/session";

const LABEL_BY_ROLE: Record<CurrentProfile["role"], string> = {
  admin: "Admin",
  profesor: "Profesor/a",
  alumno: "Alumno/a",
};

export function RoleShell({
  profile,
  children,
}: {
  profile: CurrentProfile;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-sm text-slate-500">{LABEL_BY_ROLE[profile.role]}</p>
          <p className="font-medium text-slate-900">
            {profile.nombre} {profile.apellido}
          </p>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm text-slate-500 underline">
            Cerrar sesión
          </button>
        </form>
      </header>
      <div className="flex flex-1 flex-col p-4">{children}</div>
    </div>
  );
}
