import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/session";
import { ProfesorShell } from "@/components/profesor/profesor-shell";

export const dynamic = "force-dynamic";

export default async function ProfesorLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole("profesor");

  return <ProfesorShell profile={profile}>{children}</ProfesorShell>;
}
