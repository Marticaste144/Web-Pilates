import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/session";
import { RoleShell } from "@/components/role-shell";
import { AlumnoNav } from "@/components/alumno/alumno-nav";

export const dynamic = "force-dynamic";

export default async function AlumnoLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole("alumno");

  return (
    <RoleShell profile={profile}>
      <AlumnoNav />
      {children}
    </RoleShell>
  );
}
