import type { ReactNode } from "react";
import type { CurrentProfile } from "@/lib/auth/session";
import { ProfesorSidebar } from "@/components/profesor/profesor-sidebar";
import { ProfesorTopbar } from "@/components/profesor/profesor-topbar";

export function ProfesorShell({ profile, children }: { profile: CurrentProfile; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-neutral-50 md:flex-row">
      <ProfesorSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ProfesorTopbar nombre={profile.nombre} apellido={profile.apellido} />
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 sm:px-6 md:pb-10">{children}</div>
      </div>
    </div>
  );
}
