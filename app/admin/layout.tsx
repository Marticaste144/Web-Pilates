import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole("admin");

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
