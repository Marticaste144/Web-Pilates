import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/session";
import { RoleShell } from "@/components/role-shell";
import { ProfesorNav } from "@/components/profesor/profesor-nav";

export const dynamic = "force-dynamic";

export default async function ProfesorLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole("profesor");

  return (
    <RoleShell profile={profile}>
      <ProfesorNav />
      {children}
    </RoleShell>
  );
}
