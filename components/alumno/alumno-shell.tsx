import type { ReactNode } from "react";
import type { CurrentProfile } from "@/lib/auth/session";
import { AlumnoSidebar } from "@/components/alumno/alumno-sidebar";
import { AlumnoTopbar } from "@/components/alumno/alumno-topbar";

export function AlumnoShell({ profile, children }: { profile: CurrentProfile; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-neutral-50 md:flex-row">
      <AlumnoSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AlumnoTopbar nombre={profile.nombre} apellido={profile.apellido} />
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 sm:px-6 md:pb-10">{children}</div>
      </div>
    </div>
  );
}
