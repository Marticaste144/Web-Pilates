import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/session";
import { RoleShell } from "@/components/role-shell";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole("admin");

  return (
    <RoleShell profile={profile} nav={<AdminNav />}>
      {children}
    </RoleShell>
  );
}
