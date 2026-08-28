import type { ReactNode } from "react";
import type { CurrentProfile } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";

export function AdminShell({ profile, children }: { profile: CurrentProfile; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-neutral-50 md:flex-row">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar nombre={profile.nombre} apellido={profile.apellido} />
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 sm:px-6 md:pb-10">{children}</div>
      </div>
    </div>
  );
}
