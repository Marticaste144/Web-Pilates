import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/session";
import { RoleShell } from "@/components/role-shell";

export const dynamic = "force-dynamic";

export default async function ProfesorLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole("profesor");

  return <RoleShell profile={profile}>{children}</RoleShell>;
}
